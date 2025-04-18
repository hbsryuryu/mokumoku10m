// 呼び出し
// <SupplierFooter colorArray={[1, 0, 0, 0]} />

import React from "react";
import { useNavigate } from "react-router-dom";
import { myUrl } from "../route/MainRoute.js";

import "../css/Footer.css";
import { svgToBase64DataURL } from "../js/create_src_svg.js";

// 再レンダリングによる上書を防止
const statusColorArray = ["#888", "#404040"];

const SupplierFooter = (props) => {
	const navigate = useNavigate();
	const selectColorArray = props.colorArray; //[1,0,0,0]を想定
	var checkDuumy = 0;
	try {
		checkDuumy = selectColorArray[3];
	} catch (error) {
		selectColorArray = [0, 0, 0, 0];
	}

	return (
		<>
			<div className="footerDiv">
				<div style={{ padding: "0.5em 1.5em", display: "flex", justifyContent: "space-between" }}>
					<div
						onClick={() => {
							navigate(myUrl("s_i_regi"));
						}}
					>
						<img className="footerImg" src={svgToBase64DataURL("1em", statusColorArray[selectColorArray[0]], "arrowUpIcon")} alt="" />
						<p style={{ color: statusColorArray[selectColorArray[0]] }} className="footerP">
							出品する
						</p>
					</div>
					<div
						onClick={() => {
							navigate(myUrl("s_i_mana_l"));
						}}
					>
						<img className="footerImg" src={svgToBase64DataURL("1em", statusColorArray[selectColorArray[1]], "clipboardListIcon")} alt="" />
						<p style={{ color: statusColorArray[selectColorArray[1]] }} className="footerP">
							取引管理
						</p>
					</div>
					<div
						onClick={() => {
							navigate(myUrl("s_sale_mana"));
						}}
					>
						<img className="footerImg" src={svgToBase64DataURL("1em", statusColorArray[selectColorArray[2]], "yenIcon")} alt="" />
						<p style={{ color: statusColorArray[selectColorArray[2]] }} className="footerP">
							売上管理
						</p>
					</div>
					<div
						onClick={() => {
							navigate(myUrl("s_my_p"));
						}}
					>
						<img className="footerImg" src={svgToBase64DataURL("1em", statusColorArray[selectColorArray[3]], "userIcon")} alt="" />
						<p style={{ color: statusColorArray[selectColorArray[3]] }} className="footerP">
							マイページ
						</p>
					</div>
				</div>
			</div>
		</>
	);
};

export default SupplierFooter;
