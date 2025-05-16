import React, { useState } from "react";

export const ProductInfo = () => {

    const [pageState, setPageState] = useState(0); // 0 = 一覧表示, 1 = 詳細表示 など
    
    const inventoryData = [
        { name: "Product A", quantity: 10 },
        { name: "Product B", quantity: 0 },
        { name: "Product C", quantity: 25 }
    ];

    React.useEffect(() => {
        window.scrollTo(0, 0); // ページ遷移時にスクロール位置をトップにリセット
    }, []);
    return (
        <>
            <div>
                <p>商品ページ</p>
            </div>
            <div>
                <h1>商品在庫</h1>

                <button onClick={() => setPageState(0)}>一覧表示</button>
                <button onClick={() => setPageState(1)}>在庫がある商品のみ</button>

                {pageState === 0 && (
                    <table border="1">
                    <thead>
                        <tr>
                        <th>Product Name</th>
                        <th>Stock Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventoryData.map((item, index) => (
                        <tr key={index}>
                            <td>{item.name}</td>
                            <td>{item.quantity}</td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                )}

                {pageState === 1 && (
                    <table border="1">
                    <thead>
                        <tr>
                        <th>Product Name</th>
                        <th>Stock Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventoryData
                        .filter(item => item.quantity > 0)
                        .map((item, index) => (
                            <tr key={index}>
                            <td>{item.name}</td>
                            <td>{item.quantity}</td>
                            </tr>
                        ))}
                    </tbody>
                    </table>
                )}
            </div>
        </>
    );
};

export default ProductInfo;