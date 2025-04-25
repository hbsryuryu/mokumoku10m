import React from "react";

// Route読み込み
import { BrowserRouter, Route, Routes } from "react-router-dom";

import Top from "../pages/Top";
import Onboarding from "../pages/Onboarding";
import ItemRegistrate from "../pages/ItemRegistrate";
import ItemEdit from "../pages/ItemEdit";
import ItemManage from "../pages/ItemManage";
import ItemManagePickupTimeDetail from "../pages/ItemManagePickupTimeDetail";
import BuyerFindSearch from "../pages/BuyerFindSearch";
import FindProductDetail from "../pages/FindProductDetail";
import FindPaymentConfirm from "../pages/FindPaymentConfirm";
import FindPaymentComplete from "../pages/FindPaymentComplete";
import BuyerUnreceivedList from "../pages/BuyerUnreceivedList";
import BuyerUnreceivedProductDetail from "../pages/BuyerUnreceivedProductDetail";
import UserRegistrate from "../pages/UserRegistrate";
import BuyerMypage from "../pages/BuyerMypage";
import SupplierMypage from "../pages/SupplierMypage";
import SupplierTop from "../pages/SupplierTop";
import Page404 from "../pages/Page404";
import SupplierSalesManagement from "../pages/SupplierSalesManagement";
import ContactUs from "../pages/ContactUs";
import Privacy from "../pages/Privacy";
import Tokushoho from "../pages/Tokushoho";
import UserPublic from "../pages/UserPublic";
import SupplierTransfer from "../pages/SupplierTransfer";

import ProductRegister from "../pages/ProductRegister";
import ProductInfo from "../pages/productInfo";

// url変数化ここで一括管轄
// import { myUrl } from "../route/MainRoute.js";
const url_array = {
	onbo: "/onboarding",
	b_i_find_s: "/buyer/find/search",
	b_i_find_d: "/buyer/find/product-detail",
	b_i_find_p_d: "/buyer/find/payment-method",
	b_i_find_p_cf: "/buyer/find/payment-confirm",
	b_i_find_p_cp: "/buyer/find/payment-complete",
	b_i_recv_l: "/buyer/receive-order/unreceived/list",
	b_i_recv_p_d: "/buyer/receive-order/unreceived/product-detail",
	b_top: "/",
	b_my_p: "/buyermypage",
	b_u_regi: "/buyer/user/registrate",
	s_top: "/suppliertop",
	s_my_p: "/suppliermypage",
	s_my_p_d: "/suppliermypagedetail",
	s_sale_mana: "/supplier/salesmanagement",
	s_i_regi: "/supplier/list-item/registrate",
	s_i_edit: "/supplier/list-item/edit",
	s_i_mana_l: "/supplier/item-manage/list",
	s_i_mana_d: "/supplier/item-manage/pickup-time-detail",
	con_us: "/contact-us",
	priv: "/privacy",
	tokush: "/tokushoho",
	user_pub: "/userpublic",
	s_trans: "/suppliertransfer",
	p_r: "/product-register",
	p_i: "/product-Info"
};
export function myUrl(url_key) {
	return url_array[url_key] || "/"; // デフォルト値を設定
}

// Route指定
export const MainRoute = () => {
	return (
		<BrowserRouter>
			<Routes>
				<Route exact path="/" element={<Top />} />
				<Route path="/onboarding" element={<Onboarding />} />
				<Route path="/supplier/list-item/registrate" element={<ItemRegistrate />} />
				<Route path="/supplier/list-item/edit" element={<ItemEdit />} />
				<Route path="/supplier/item-manage/list" element={<ItemManage />} />
				<Route path="/supplier/item-manage/pickup-time-detail" element={<ItemManagePickupTimeDetail />} />
				<Route path="/buyer/user/registrate" element={<UserRegistrate />} />
				<Route path="/buyer/find/search" element={<BuyerFindSearch />} />
				<Route path="/buyer/find/product-detail" element={<FindProductDetail />} />
				<Route path="/buyer/find/payment-method" element={<FindPaymentConfirm />} />
				<Route path="/buyer/find/payment-confirm" element={<FindPaymentConfirm />} />
				<Route path="/buyer/find/payment-complete" element={<FindPaymentComplete />} />
				<Route path="/buyer/receive-order/unreceived/list" element={<BuyerUnreceivedList />} />
				<Route path="/buyer/receive-order/unreceived/product-detail" element={<BuyerUnreceivedProductDetail />} />
				<Route path="/buyermypage" element={<BuyerMypage />} />
				<Route path="/suppliertop" element={<SupplierTop />} />
				<Route path="/suppliermypage" element={<SupplierMypage />} />
				<Route path="/suppliermypagedetail" element={<SupplierMypage />} />
				<Route path="/supplier/salesmanagement" element={<SupplierSalesManagement />} />
				<Route path="/contact-us" element={<ContactUs />} />
				<Route path="/privacy" element={<Privacy />} />
				<Route path="/tokushoho" element={<Tokushoho />} />
				<Route path="/userpublic" element={<UserPublic />} />
				<Route path="/suppliertransfer" element={<SupplierTransfer />} />
				<Route path="/product-register" element={<ProductRegister />} />
				<Route path="/product-info" element={<ProductInfo />} />
				<Route path="*" element={<Page404 />} />
			</Routes>
		</BrowserRouter>
	);
};
