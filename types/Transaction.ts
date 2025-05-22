export interface Transaction {
    transactionId: string;
    tripId: string;
    debtor: string;
    creditor: string;
    amount: number;
    description: string;
    timestamp: Date | string;
}