// import Alertpop from "../components/alertpop.js";
// const submmitFunction = () => {
// 	return true;
// };
// const closeFunction = () => {
// 	setIsDisplayAlertpop(false)
// };
// const [isDisplayAlertpop, setIsDisplayAlertpop] = useState(false)
// const isNeedCancelBtn = true;
// const inputBtnText="OK";
// const inputTextArray = [
// 	{
// 		textAlign: "left",
// 		text: "ここ文字列",
// 	},
// 	{
// 		textAlign: "center",
// 		text: "ここ文字列",
// 	},
// 	{
// 		textAlign: "left",
// 		text: "ここ文字列",
// 	},
// ];
// {isDisplayAlertpop && <Alertpop />}

import React, { useState } from "react";
import "../css/c66_alertpop.css";

import SvgIcon from "../components/SvgIcon.js";

const Alertpop = (props) => {
	const submmitFunction = () => {
		return true;
	};
	const closeFunction = () => {
		return true;
	};
	const [isNeedCancelBtn, setIsNeedCancelBtn] = useState(true);
	const [inputBtnText, setInputBtnText] = useState("OK");
	const [inputTextArray, setInputTextArray] = useState([
		{
			textAlign: "left",
			text: "ここ文字列",
		},
		{
			textAlign: "center",
			text: "ここ文字列",
		},
		{
			textAlign: "left",
			text: "ここ文字列",
		},
	]);

	return (
		<div className="c66_div1" onClick={closeFunction}>
			<div className="c66_div2">
				<div className="c66_div4" onClick={closeFunction}>
					<SvgIcon size={"1.1rem"} color={"#262626"} iconName={"cross"} />
				</div>
				<div className="c66_div3">
					{inputTextArray.map((textDict, index) => (
						<>
							<p key={index} style={{ textAlign: textDict.textAlign }}>
								{textDict.text}
							</p>
						</>
					))}
					<div style={{ height: "1rem" }}></div>
					{isNeedCancelBtn && (
						<>
							<button onClick={submmitFunction}>{inputBtnText}</button>
							<button onClick={closeFunction}>閉じる</button>
						</>
					)}
					{!isNeedCancelBtn && (
						<div style={{ textAlign: "center" }}>
							<button onClick={submmitFunction}>{inputBtnText}</button>
						</div>
					)}
					<div style={{ height: "1.2rem" }}></div>
				</div>
			</div>
		</div>
	);
};

export default Alertpop;
