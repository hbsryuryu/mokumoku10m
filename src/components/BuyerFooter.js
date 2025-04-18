// 呼び出し
// <BuyerFooter colorArray={[1, 0, 0]} />

import React from "react";
import { useNavigate } from "react-router-dom";
import { myUrl } from "../route/MainRoute.js";

import "../css/Footer.css";
import { svgToBase64DataURL } from "../js/create_src_svg.js";

// 再レンダリングによる上書を防止
const statusColorArray = ["#888", "#19774b"];

const BuyerFooter = (props) => {
	const navigate = useNavigate();
	const selectColorArray = props.colorArray; //[1,0,0]を想定
	var checkDuumy = 0;
	try {
		checkDuumy = selectColorArray[2];
	} catch (error) {
		selectColorArray = [0, 0, 0];
	}

	return (
		<>
			<div className="footerDiv">
				<div style={{ padding: "0.5em 1.5em", display: "flex", justifyContent: "space-between" }}>
					<div
						onClick={() => {
							navigate(myUrl("b_i_find_s"));
						}}
					>
						<img className="footerImg" src={svgToBase64DataURL("1em", statusColorArray[selectColorArray[0]], "searchIcon")} alt="" />
						<p style={{ color: statusColorArray[selectColorArray[0]] }} className="footerP">
							探す
						</p>
					</div>
					<div
						onClick={() => {
							navigate(myUrl("b_i_recv_l"));
						}}
					>
						<img className="footerImg" src={svgToBase64DataURL("1.1em", statusColorArray[selectColorArray[1]], "humanWalk")} alt="" />
						<p style={{ color: statusColorArray[selectColorArray[1]] }} className="footerP">
							受け取る
						</p>
					</div>
					<div
						onClick={() => {
							navigate(myUrl("b_my_p"));
						}}
					>
						<img className="footerImg" src={svgToBase64DataURL("1em", statusColorArray[selectColorArray[2]], "userIcon")} alt="" />
						<p style={{ color: statusColorArray[selectColorArray[2]] }} className="footerP">
							マイページ
						</p>
					</div>
				</div>
			</div>
		</>
	);
};

export default BuyerFooter;
