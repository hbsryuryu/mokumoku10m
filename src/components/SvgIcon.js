// 呼び出し方
// import SvgIcon from "../components/SvgIcon.js";
// <SvgIcon size={"11em"} color={"#f00"} iconName={"houseIcon"} />

import React from "react";
import { innerSvgHtml, calcSvgRelativeHight } from "../js/create_src_svg.js";

const SvgIcon = ({ size, color, iconName }) => {
	// dangerouslySetInnerHTMLを使うので、constで厳密定義
	const innerSvg = innerSvgHtml(color, iconName);
	const svgRelativeHeightCssStr = calcSvgRelativeHight(innerSvg["viewBox"], size);
	return <>{!innerSvg["isError"] && <svg width={size} height={svgRelativeHeightCssStr} viewBox={innerSvg["viewBox"]} xmlns="http://www.w3.org/2000/svg" version="1.1" dangerouslySetInnerHTML={{ __html: innerSvg["innerHtml"] }} />}</>;
};

export default SvgIcon;
