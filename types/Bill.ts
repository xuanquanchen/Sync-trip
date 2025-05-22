export interface Bill {
    id: string;
    createdBy: string;
    participants: string[];
    title: string;
    currency: string;
    summary: Summary;
    isDraft?: boolean;
    archived?: boolean;
    description?: string;
    category?: "food"|"transport"|"lodging"|"activity"|string;
}

export interface Summary {
    [debtor: string]: {
      [creditor: string]: number;
    };
}
  