import React, { useState } from "react";

export const ProductInfo = () => {
    const [pageState, setPageState] = useState(0);
    const [formData, setFormData] = useState({
        isreRenderDummy: false,
        id: "",
        image_url: "",
        img64: "",
        field1: "",
        field2: "",
        field3: "",
        field4: "",
        field5: "",
        field6: "",
    });

    React.useEffect(() => {
        window.scrollTo(0, 0); // ページ遷移時にスクロール位置をトップにリセット
    }, []);
    return (
        <>
            <p>商品ページ</p>
        </>
    );
};

export default ProductInfo;