import { ErrorBoundary } from "@api/ui/components";
import { findByPropsLazy } from "@metro";

import { ActionSheet } from "./ActionSheet";
import ReviewActionSheet from "./ReviewActionSheet";
const { TableRow, TableRowGroup } = findByPropsLazy("TableRow");

interface ReviewCardProps {
    userId: string;
}

export default function ReviewCard({ userId }: ReviewCardProps) {
    return (
        <ErrorBoundary>
            <TableRowGroup>
                <TableRow
                    label="Reviews"
                    onPress={() => {
                        ActionSheet.open(ReviewActionSheet, { userId });
                    }}
                />
            </TableRowGroup>
        </ErrorBoundary>
    );
}
