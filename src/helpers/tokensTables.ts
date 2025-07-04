interface TableColumn {
    title: string;
    dataIndex: string;
    align: "left" | "right" | "center";
    width?: number;
}

export const ProvideColumnsCA: TableColumn[] = [
    {
        title: "Name",
        dataIndex: "name",
        align: "left",
        width: 380,
    },
    {
        title: "Price in USD",
        dataIndex: "price",
        align: "right",
        width: 200,
    },
    {
        title: "Variation 24hs",
        dataIndex: "variation",
        align: "right",
        width: 200,
    },
    {
        title: "Balance",
        dataIndex: "balance",
        align: "right",
        width: 190,
    },
    {
        title: "USD",
        dataIndex: "usd",
        align: "right",
        /*width: 190,*/
    },
];

export const ProvideColumnsTP: TableColumn[] = [
    {
        title: "Name",
        dataIndex: "name",
        align: "left",
        width: 380,
    },
    {
        title: "Tokens per USD",
        dataIndex: "price",
        align: "right",
        width: 200,
    },
    {
        title: "Variation 24hs",
        dataIndex: "variation",
        align: "right",
        width: 200,
    },
    {
        title: "Balance",
        dataIndex: "balance",
        align: "right",
        width: 190,
    },
    {
        title: "USD",
        dataIndex: "usd",
        align: "right",
        /*width: 190,*/
    },
];
