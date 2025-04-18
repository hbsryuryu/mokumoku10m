import React from "react";

// component群
import BuyerFooter from "../components/BuyerFooter";
import FooterLink from "../components/FooterLink.js";
import CommonHeader from "../components/CommonHeader.js";

//css群
import "../css/c18_Privacy.css";

const Tokushoho = () => {
	return (
		<>
			<CommonHeader />
			<p className="g-titlebar">　</p>

			<div className="c18-div2">
				<p className="c18-p5">特定商取引法に基づく表記</p>
				<div className="c18-div4 c18-div4-t">
					<p className="c18-p21">販売者</p>
					<p className="c18-p22">商品ごとに表示</p>
					<p className="c18-p22">※所在地・連絡先は請求後に速やかに開示します。</p>
				</div>

				<div className="c18-div4">
					<p className="c18-p21">運営者</p>
					<p className="c18-p22">株式会社ファンデリー</p>
				</div>

				<div className="c18-div4">
					<p className="c18-p21">代表者</p>
					<p className="c18-p22">阿部　公祐</p>
				</div>

				<div className="c18-div4">
					<p className="c18-p21">所在地</p>
					<p className="c18-p22">東京都北区赤羽2-51-3 NS3ビル3F</p>
				</div>

				<div className="c18-div4">
					<p className="c18-p21">連絡先</p>
					<p className="c18-p22">XXX-XXXX-XXXX</p>
					<p className="c18-p22">XXXXX@XXXXXXXXX</p>
				</div>

				<div className="c18-div4">
					<p className="c18-p21">販売価格</p>
					<p className="c18-p22">商品ごとに表示</p>
				</div>

				<div className="c18-div4">
					<p className="c18-p21">配送料</p>
					<p className="c18-p22">XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX</p>
				</div>

				<div className="c18-div4">
					<p className="c18-p21">お支払い方法</p>
					<p className="c18-p22">・クレジットカード</p>
					<p className="c18-p22">・XXXXXXXXXXXXXX</p>
					<p className="c18-p22">・XXXXXXXXXXXXXX</p>
				</div>

				<div className="c18-div4">
					<p className="c18-p21">お支払い期限</p>
					<p className="c18-p22">XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX</p>
				</div>

				<div className="c18-div4">
					<p className="c18-p21">商品の引き渡し時期</p>
					<p className="c18-p22">各商品の詳細ページ、または注文履歴よりご確認ください。</p>
				</div>

				<div className="c18-div4">
					<p className="c18-p21">商品の返品・交換</p>
					<p className="c18-p22">商品の返品は以下の場合のみとなります。</p>
					<p className="c18-p22">　・ご注文した商品と異なる場合</p>
					<p className="c18-p22">　・破損等による不良品である場合</p>
					<br />
					<p className="c18-p22">【注意】</p>
					<p className="c18-p25">返品交換期限は、商品到着後8日以内とさせて いただきます。</p>
					<p className="c18-p25">
						返品の際は、お送りいただく前に必ず0120-054-014までご連絡ください。
						<br />
						ご連絡なき場合、承ることができません。
					</p>
					<p className="c18-p25">
						ご連絡は営業日の受付時間内にお願いいたします。
						<br />
						受付時間/平日9時～17時15分
						<br />
						定休日/土・日・祝日
					</p>
					<p className="c18-p25">
						返品の際は、商品をそのまま返送してください。
						<br />
						商品を破棄されました場合、返金・交換等には
						<br />
						一切応じられませんのでご了承ください。
					</p>
					<p className="c18-p25">商品は着払いでお送りください。</p>
				</div>

				<div className="c18-div4 c18-div4-b">
					<p className="c18-p21">キャンセル</p>
					<p className="c18-p22">XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX</p>
				</div>
			</div>
			<FooterLink />
			<BuyerFooter colorArray={[0, 0, 1]} />
		</>
	);
};

export default Tokushoho;
