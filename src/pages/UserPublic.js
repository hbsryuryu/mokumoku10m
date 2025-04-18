// ユーザーが出品してる商品一覧表示

import React, { useEffect, useState, useContext } from "react";
import { MyContext } from "../provider/MyContext";
import { useNavigate } from "react-router-dom";
import { myUrl } from "../route/MainRoute.js";

// component群
import SvgIcon from "../components/SvgIcon.js";
import SupplierFooter from "../components/SupplierFooter";
// import BuyerFooter from "../components/BuyerFooter";
import FooterLink from "../components/FooterLink.js";
import CommonHeader from "../components/CommonHeader.js";

//css群
import "../css/c9_smypage.css";
import "../css/c5_BuyerFindSearchList.css";

//api群
const { post_login_req, post_logout_req, postSupplierUserEdit } = require("../api/post_data_req.js");
const { get_user_profile_req, getItemList, getItemWithId } = require("../api/get_data_req.js");

// function群
const { funcIsLoginErrorCss } = require("../js/function_input.js");
const { funcSearchItemWithMarker } = require("../js/item_search_sort.js");
const { int2currencyStr } = require("../js/currency_str.js");
const req_base_url = require("../js/get_base_url");
const baseUrl = req_base_url();

const defaultIntPassVisible = 1;
const passVisibleArray = ["password", "text"];

const UserPublic = () => {
	const { state, setState } = useContext(MyContext);
	const navigate = useNavigate();
	const [formData, setFormData] = useState({});

	// フォームデータ変更機構
	const handleChange = (e) => {
		const { name, value } = e.target;
		// setFormData({
		// 	...formData,
		// 	[name]: value,
		// });
	};

	// キャッシュ対策込み
	function srcImage(image_base64, imaeg_url) {
		if (image_base64 === "" || image_base64 === undefined) {
			return baseUrl + imaeg_url;
		} else {
			return image_base64;
		}
	}

	const [itemDataArray, setItemDataArray] = useState([]);
	const [reqItemList, setReqItemList] = useState([]);
	useEffect(() => {
		getItemList()
			.then((return_array) => {
				setReqItemList(return_array);
			})
			.catch((error) => {
				console.error(error);
			});
	}, []);

	// 商品リクエスト後の描画データ格納
	useEffect(() => {
		setItemDataArray(funcSearchItemWithMarker(reqItemList, ""));
	}, [reqItemList]);

	// // 商品リクエスト後の描画データ格納
	function funcMoveItemDetail(item_id) {
		navigate(myUrl("b_i_find_d") + "?item_id=" + String(item_id));
	}

	return (
		<>
			<CommonHeader />
			<p className="g-titlebar2">マイページ</p>

			<div className="c9-div8">
				<div className="c9-div99">
					<img className="c9-div8img" src={srcImage("", state.userData.campany_header_image_url)} alt="" />
				</div>
				<div>
					<img className="c9-div9img" src={srcImage("", state.userData.campany_image_url)} alt="" />
				</div>
			</div>

			<p className="c9-p23">生産者名</p>

			{/* <p className="g-p2">{state.userData.campany_name}</p> */}

			<input className="g-inp" type="text" name="campany_name" value={state.userData.campany_name} placeholder="必須" onChange={handleChange} />
			<p className="c9-p23">産地住所</p>
			<input className="g-inp" type="text" name="campany_locate_name" value={state.userData.campany_locate_name} placeholder="必須" onChange={handleChange} />
			<p className="c9-p23">生産者紹介</p>
			<textarea className="g-txt" type="text" name="campany_discripsion" value={state.userData.campany_discripsion} placeholder="例）埼玉県本庄市の豊かな大地で育てた、こだわりのニンジンをご紹介します。当農園では、自然環境を大切にしながら、丹精込めて育てたニンジンを皆さまにお届けしています。" onChange={handleChange} />

			<p className="c9-p23">こだわり１</p>
			<input className="g-inp" type="text" name="company_feature1_summary" value={state.userData.company_feature1_summary} placeholder="必須" onChange={handleChange} />
			<div className="c9-div99">
				<img className="c9-div10img" src={srcImage("", state.userData.company_feature1_image_url)} alt="" />
			</div>
			<textarea className="g-txt" type="text" name="company_feature1_discripsion" value={state.userData.company_feature1_discripsion} placeholder="必須" onChange={handleChange} />

			<p className="c9-p23">こだわり２</p>
			<input className="g-inp" type="text" name="company_feature2_summary" value={state.userData.company_feature2_summary} placeholder="必須" onChange={handleChange} />
			<div className="c9-div99">
				<img className="c9-div10img" src={srcImage("", state.userData.company_feature2_image_url)} alt="" />
			</div>
			<textarea className="g-txt" type="text" name="company_feature2_discripsion" value={state.userData.company_feature2_discripsion} placeholder="必須" onChange={handleChange} />

			<p className="c9-p23">こだわり３</p>
			<input className="g-inp" type="text" name="company_feature3_summary" value={state.userData.company_feature3_summary} placeholder="必須" onChange={handleChange} />
			<div className="c9-div99">
				<img className="c9-div10img" src={srcImage("", state.userData.company_feature3_image_url)} alt="" />
			</div>
			<textarea className="g-txt" type="text" name="company_feature3_discripsion" value={state.userData.company_feature3_discripsion} placeholder="必須" onChange={handleChange} />

			<div style={{ height: "2em" }}></div>
			<div className="mapPosition">
				<br />
				<div className="c5-itemdiv1">
					{itemDataArray.map((item, index) => (
						<div className="c5-itemdiv2">
							<div className="c5-itemdiv3">
								<div
									key={index}
									className="test"
									onClick={() => {
										funcMoveItemDetail(item.id);
									}}
								>
									<div className="tset">
										<img className="c5-itemdiv3img" src={baseUrl + item.image_url} alt="" />
									</div>

									<div className="c5-itemdiv4">
										<p className="g-over2">{item.name}</p>
										<div className="c5-div9">
											<p className="c5-p4">{item.bulk_1set_count}</p>
											<p className="c5-p3">{int2currencyStr(item.bulk_price)}</p>
										</div>

										{/* <p>Status: {StatusStr[item.saleState]}</p> */}
									</div>
									<div className="c5-itemdiv6">
										<div className="c5-itemdiv7">
											<img className="c5-itemdiv7img" src={baseUrl + item.seller_user_image_url} alt="" />
										</div>
										<div className="c5-itemdiv8">
											<p className="c5-p8 g-over1"> {item.campany_locate_name}</p>
											<p className="c5-p9 g-over1">{item.campany_name}</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

			<FooterLink />
			<SupplierFooter colorArray={[0, 0, 0, 1]} />
		</>
	);
};

export default UserPublic;
