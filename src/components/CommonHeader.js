// 呼び出し
// <CommonHeader colorArray={[1, 0, 0, 0]} />

import React from "react";
import { useNavigate } from "react-router-dom";
import { myUrl } from "../route/MainRoute.js";

import { svgToBase64DataURL } from "../js/create_src_svg.js";
import SvgIcon from "../components/SvgIcon.js";

import "../css/c4_CommonHeader.css";

// 再レンダリングによる上書を防止
const statusColorArray = ["#888", "#404040"];

const CommonHeader = () => {
	const navigate = useNavigate();
	const selectColorArray = [1, 0, 0, 0]; //[1,0,0,0]を想定

	return (
		<>
			<div className="c4-div1">
				<div
					onClick={() => {
						navigate(myUrl("b_top"));
					}}
				>
					<img src={svgToBase64DataURL("10rem", "#262626", "topLogoSimple")} alt="" />
				</div>

				<div>
					<p className="c4-p2">GoFarmの魅力</p>
				</div>
				<div>
					<img className="" src={svgToBase64DataURL("1.5em", "#404040", "menuBurger")} alt="" />
				</div>
			</div>
		</>
	);
};

export default CommonHeader;
