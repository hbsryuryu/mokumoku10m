import React, { useContext } from "react";
import { MyContext } from "../provider/MyContext";
import { useNavigate } from "react-router-dom";
import { myUrl } from "../route/MainRoute.js";

import "../css/c74_FindPaymentComplete.css";
import BuyerFooter from "../components/BuyerFooter";

const FindPaymentComplete = () => {
	const navigate = useNavigate();
	function SubmitOrder() {
		navigate(myUrl("b_i_recv_l"));
	}

	return (
		<>
			<div className="c74_div1">
				<p style={{ lineHeight: "40vh" }}>決済が完了しました。</p>
				<button className="g-btn1 g-btn-clr1 g-btn-sp1" onClick={SubmitOrder}>
					取引確認画面へ
				</button>
			</div>
			<BuyerFooter colorArray={[1, 0, 0]} />
		</>
	);
};

export default FindPaymentComplete;
