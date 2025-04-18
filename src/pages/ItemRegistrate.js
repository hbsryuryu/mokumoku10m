import React, { useEffect } from "react";
import { useState } from "react";

// component群
import ItemCreator from "../components/ItemCreator";

function ItemRegistrate() {
	useEffect(() => {
		window.scrollTo(0, 0); // ページ遷移時にスクロール位置をトップにリセット
	}, []);
	const [pageState, setPageState] = useState(0);
	const [formData, setFormData] = useState({
		isreRenderDummy: false,
		id: "",
		image_url: "",
		img64: "",
		field1: "",
		field2: "",
		field3: "",
		field4: "",
		field5: "",
		field6: "0",
		timeArray: [],
		orderArray: [],
		locate_name: "",
		locate_discripsion: "",
		longitude: 138.678574,
		latitude: 36.556637,
		isUseGeoApi: false,
	});

	return <ItemCreator formData={formData} setFormData={setFormData} pageState={pageState} setPageState={setPageState} />;
}

export default ItemRegistrate;
