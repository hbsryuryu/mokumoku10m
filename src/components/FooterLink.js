import { useNavigate } from "react-router-dom";
import "../css/c15_FooterLink.css";

import xIcon from "../img/xicon.png";
import lIcon from "../img/licon.png";

import { myUrl } from "../route/MainRoute.js";

const FooterLink = () => {
	const navigate = useNavigate();
	function moveAndTop(targetUrlTag) {
		navigate(myUrl(targetUrlTag));
		window.scrollTo(0, 0);
	}
	return (
		<>
			<div className="c15-div1">
				<p className="c15-p1">購入したい</p>
				<p className="c15-p2">GoFarmの魅力</p>
				<p className="c15-p2">ご利用ガイド</p>
				<p className="c15-p1">出品したい</p>
				<p className="c15-p2">生産者出品フォーム</p>
				<p className="c15-p1">GoFarmについて</p>

				<p
					className="c15-p2"
					onClick={() => {
						moveAndTop("priv");
					}}
				>
					利用規約
				</p>
				<p className="c15-p2">プライバシーポリシー</p>
				<p
					className="c15-p2"
					onClick={() => {
						moveAndTop("tokush");
					}}
				>
					特定商法に基づく表記
				</p>
				<p
					className="c15-p2"
					onClick={() => {
						moveAndTop("con_us");
					}}
				>
					お問い合わせ
				</p>
				<p className="c15-p2">運営会社</p>
			</div>
			<div className="c15-div2">
				<div className="c15-div3">
					<img className="c15-img1" src={xIcon} alt="" />
				</div>
				<div className="c15-div3">
					<img className="c15-img1" src={lIcon} />
				</div>
			</div>
			<p className="c15-p3">Copyright © 2024 Fundely Co.,Ltd.</p>
		</>
	);
};

export default FooterLink;
