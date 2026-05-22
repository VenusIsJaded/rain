import { lazyDestructure } from "@lib/utils/lazy";
import { ErrorBoundary } from "@api/ui/components";
import { semanticColors } from "@api/ui/components/color";
import { createStyles } from "@api/ui/styles";
import { logger as _rdbLogger } from "@lib/utils/logger";
import { findByNameLazy, findByProps, findByStoreName } from "@metro";
import { React, ReactNative as RN } from "@metro/common";

import { Review } from "../def";
import { getReviews } from "../lib/api";
import { useReviewDBSettings } from "../storage";
import ReviewInput from "./ReviewInput";
import ReviewRow from "./ReviewRow";

const { getCurrentUser } = lazyDestructure(() => findByStoreName("UserStore"));
const UserProfileCard = findByNameLazy("UserProfileCard");

interface ReviewSectionProps {
    userId: string;
}

const { FlashList } = lazyDestructure(() => findByProps("FlashList"));

// BUG FIX: createStyles was called INSIDE the component body on every render,
// creating a new StyleSheet each time. Hoisted to module scope so the
// stylesheet is created once and reused.
const useStyles = createStyles({
    avatar: {
        height: 36,
        width: 36,
        borderRadius: 18,
    },
    card: {
        backgroundColor: semanticColors.CARD_PRIMARY_BG,
        borderRadius: 16,
        padding: 8,
    },
    reviewCard: {
        backgroundColor: semanticColors.CARD_SECONDARY_BG,
    },
});

// BUG FIX: ItemSeparatorComponent was an inline arrow function, causing React
// to unmount/remount separators on every render. Hoisted to a stable reference.
const ItemSeparator = () => <RN.View style={{ height: 8 }} />;


export default function ReviewSection({ userId }: ReviewSectionProps) {
    _rdbLogger.log("[reviewdb/section] RENDER for userId=", userId);
    const [reviews, setReviews] = React.useState<Review[]>([]);

    // BUG FIX: Define fetchReviews as a stable callback so it can be passed
    // to ReviewInput's refetch prop. Previously `fetchReviews` was referenced
    // in JSX but never defined — this was a crash-level bug (ReferenceError).
    const fetchReviews = React.useCallback(() => {
        getReviews(userId).then(setReviews).catch(() => {});
    }, [userId]);

    React.useEffect(() => {
        let mounted = true;
        getReviews(userId)
            .then(i => { if (mounted) setReviews(i); })
            .catch(() => {}); // BUG FIX: Added catch to prevent unhandled rejection if API is down
        return () => { mounted = false; };
    }, [userId]);

    // OPTIMIZATION: Use .some() instead of .filter().length !== 0.
    // .some() short-circuits on the first match; .filter() always scans the
    // entire array and allocates a new one.
    const hasExistingReview = reviews.some(
        i => i.sender.discordID === getCurrentUser()?.id
    );

    const reviewdbSettings = useReviewDBSettings();
    const styles = useStyles();

    // OPTIMIZATION: Memoize the filtered data array so FlashList doesn't
    // receive a new array reference on every render when nothing changed.
    const displayedReviews = React.useMemo(
        () => reviewdbSettings.showWarning
            ? reviews
            : reviews.filter(review => review.type !== 3),
        [reviews, reviewdbSettings.showWarning]
    );

    // DIAGNOSTIC: log resolved components on first render (once per mount)
    React.useEffect(() => {
        _rdbLogger.log(
            "[reviewdb/section] mounted; UserProfileCard=", typeof UserProfileCard,
            "FlashList=", typeof FlashList,
            "reviews=", reviews.length,
        );
    }, []);

    // DIAGNOSTIC: hot pink border so we can SEE where this component lands
    const debugBorder = { borderWidth: 2, borderColor: "magenta" };

    // Fallback if UserProfileCard didn't resolve on this build
    const Card: any = UserProfileCard ?? ((props: any) =>
        <RN.View style={[{ padding: 12 }, debugBorder]}>
            <RN.Text style={{ color: "magenta", fontWeight: "bold" }}>
                ReviewDB (UserProfileCard missing — fallback render)
            </RN.Text>
            {props.children}
        </RN.View>);

    return (
        <ErrorBoundary>
            <RN.View style={[styles.card, debugBorder]}>
                <Card title="Reviews" styles={[styles.card]}>
                    <FlashList estimatedItemSize={100}
                        ItemSeparatorComponent={ItemSeparator}
                        data={displayedReviews}
                        renderItem={({ item }: any) => (
                            <ReviewRow
                                style={styles.reviewCard}
                                review={item}
                            />
                        )}
                        // BUG FIX: keyExtractor used sender.username which is
                        // NOT unique — two reviews from different users with
                        // the same username would collide, causing rendering
                        // bugs (wrong review shown, stale state). Using review
                        // id (unique) is correct.
                        keyExtractor={(item: any) => String(item.id)}
                        scrollEnabled={false}
                    />
                    <ReviewInput
                        userId={userId}
                        refetch={fetchReviews}
                        shouldEdit={hasExistingReview}
                    />
                </Card>
            </RN.View>
        </ErrorBoundary>
    );
}
