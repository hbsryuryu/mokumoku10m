import React from "react";
import { useState } from "react";

const data = {
	id: 16516,
	name: "高菜",
	current_price: 1000,
	buyout_price: 15000,
};

export const ProductRegister = () => {
	// const [pageState, setPageState] = useState(0);
	// const [formData, setFormData] = useState({
	// 	isreRenderDummy: false,
	// 	id: "",
	// 	image_url: "",
	// 	img64: "",
	// 	field1: "",
	// 	field2: "",
	// 	field3: "",
	// 	field4: "",
	// 	field5: "",
	// 	field6: "0",
	// });

	React.useEffect(() => {
		window.scrollTo(0, 0); // ページ遷移時にスクロール位置をトップにリセット
	}, []);
	return (
		<>
			<p>出品ページ</p>
			<p>ここ画像</p>
			<input type="file" name="test" id="test" />
			<p>
				<label for="input1">商品名</label>
				<input type="text" id="input1" />
			</p>
			<p>
				<label for="input2">現在価格</label>
				<input type="text" id="input2" />
			</p>
			<p>
				<label for="input2">即決価格</label>
				<input type="text" id="input2" />
			</p>
			<button type="button">登録</button>
			<button type="button">キャンセル</button>
		</>
	);
};

export default ProductRegister;
