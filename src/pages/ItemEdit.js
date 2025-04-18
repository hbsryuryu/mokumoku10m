// 警告の実装
// 発注データを持っている時間は削除させない
// ログインしていないのに編集できる

import React, { useContext, useEffect } from "react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MyContext } from "../provider/MyContext";

// component群
import ItemCreator from "../components/ItemCreator";

//api群
const { getItemWithId } = require("../api/get_data_req");

// function群
const { funcSortTimes } = require("../js/item_search_sort.js");

function ItemRegistrate() {
	const [searchParams] = useSearchParams();
	const [pageState, setPageState] = useState(0);

	// 更新はstateそのものなので、更新関数不要
	const [isReady2edit, setIsReady2edit] = useState(false);
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
		longitude: 0,
		latitude: 0,
		isUseGeoApi: false,
	});

	useEffect(() => {
		window.scrollTo(0, 0);

		const item_id = searchParams.get("item_id");
		if (item_id !== null || item_id !== "" || typeof item_id !== "string") {
			getItemWithId(item_id)
				.then((return_array) => {
					if (return_array.length !== 0) {
						const sortTimeItemDict = funcSortTimes(return_array[0]);
						const updateDict = {
							isreRenderDummy: false,
							id: item_id,
							image_url: sortTimeItemDict.image_url,
							img64: "",
							field1: sortTimeItemDict.name,
							field2: sortTimeItemDict.bulk_1set_count,
							field3: sortTimeItemDict.bulk_price,
							field4: sortTimeItemDict.discripsion,
							field5: String(sortTimeItemDict.order_limit_count),
							field6: String(sortTimeItemDict.sale_state),
							timeArray: sortTimeItemDict.times,
							orderArray: sortTimeItemDict.orders,
							locate_name: sortTimeItemDict.item_locate_name,
							locate_discripsion: sortTimeItemDict.item_locate_discripsion,
							longitude: sortTimeItemDict.item_locate_longitude,
							latitude: sortTimeItemDict.item_locate_latitude,
							isUseGeoApi: false,
						};
						setFormData(updateDict);
						setIsReady2edit(true);
					}
				})
				.catch((error) => {
					// console.error(error);
					setIsReady2edit(true);
				});
		}
	}, []);

	return isReady2edit && <ItemCreator formData={formData} setFormData={setFormData} pageState={pageState} setPageState={setPageState} />;
}

export default ItemRegistrate;
