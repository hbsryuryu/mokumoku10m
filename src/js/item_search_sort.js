// -------配列群-------
// -------配列群-------
// -------配列群-------

// 商品検索用
function funcSearchItemWithMarker(dataArray, searchStr) {
	// 検索&mapマーカーのための内部index貼り付け
	var newArray = [];
	var index4marker = 0;
	dataArray.forEach((itemDataDict) => {
		if (searchStr === "") {
			itemDataDict["index4marker"] = index4marker;
			newArray.push(itemDataDict);
		} else if (itemDataDict.name.indexOf(searchStr) > -1) {
			// 部分一致のときの処理
			itemDataDict["index4marker"] = index4marker;
			newArray.push(itemDataDict);
		}
		index4marker += 1;
	});
	return newArray;
}

function funcCreateMarkerIndex4map(dataArray) {
	// 検索&mapマーカーのための内部index貼り付け
	var newArray = [];
	var index4marker = 0;
	dataArray.forEach((itemDataDict) => {
		newArray.push(itemDataDict);
		index4marker += 1;
	});
	return newArray;
}

function funcSortItemIsDone(itemDataArray, isState) {
	var doneArray = [];
	var notDoneArray = [];
	var newArray;
	itemDataArray.forEach((itemDataDict) => {
		if (itemDataDict.orders[0].is_recieve == true || itemDataDict.orders[0].is_cancel == true) {
			// 完了済み
			doneArray.push(itemDataDict);
		} else {
			// 完了してない
			notDoneArray.push(itemDataDict);
		}
	});

	if (isState) {
		newArray = doneArray;
	} else {
		newArray = notDoneArray;
	}

	var sortedNewArray = newArray.sort((a, b) => a.times[0].start_ts - b.times[0].start_ts);
	return sortedNewArray;
}

// order配列そのものの受け取り
function IntCountUpOrder(orderArray) {
	var returnCount = 0;
	try {
		orderArray.forEach((orderDict) => {
			returnCount += orderDict.order_count;
		});
		return returnCount;
	} catch (error) {
		return returnCount;
	}
}

// オーダーの総合計金額
function funcCountSumOrderPrice(orderArray) {
	var orderPrice = 0;
	try {
		orderArray.forEach((order) => {
			orderPrice += order.items[0].bulk_price * order.order_count;
		});
	} catch (error) {
		// console.log(error)
	}
	return orderPrice;
}

// 配列があるかどうかチェック関数
function funcIsNullDataArray(dataArray) {
	return dataArray.length === 0;
}

// -------辞書群-------
// -------辞書群-------
// -------辞書群-------

// 辞書型配列があるかどうかチェック関数
function funcIsNullDataDict(dataDict) {
	return Object.keys(dataDict).length === 0;
}

// 商品情報からorder配列を抜きだす部分も含む
function funcCountSumOrder(itemDict) {
	var orderCount = 0;
	if ("orders" in itemDict) {
		itemDict["orders"].forEach((orderDict) => {
			orderCount += orderDict.order_count;
		});
	}
	return orderCount;
}

// 商品時間配列ソート
function funcSortTimes(itemDict) {
	try {
		var sortedTimes = itemDict["times"].sort((a, b) => a.start_ts - b.start_ts);
		var newItemDict = { ...itemDict };
		newItemDict["times"] = sortedTimes;
		return newItemDict;
	} catch (error) {
		return itemDict;
	}
}

function displayStatus(orderDict) {
	if (orderDict.is_cancel) {
		return "キャンセル";
	} else if (orderDict.is_recieve) {
		return "完了";
	} else if (orderDict.is_pay) {
		return "未";
	} else {
		return "支払い待ち";
	}
}
function displayOrderCountWithCancel(orderDict) {
	if (orderDict.is_cancel) {
		return String(orderDict.cancel_order_count);
	} else {
		return String(orderDict.order_count);
	}
}
function createDictHyouka(orderArray) {
	var outputDict = {};
	try {
		orderArray.forEach((orderDict) => {
			// のちにここデータ反映
			// 0無評価　10good 1bad
			outputDict[String(orderDict.orders[0].id)] = {
				hyouka: 0,
				comment: "",
				is_hyouka: false,
			};
		});
		return outputDict;
	} catch (error) {
		return {};
	}
}
function updateDictHyouka(hyoukaDict, order_id, intBtnNumber) {
	var outputDict = { ...hyoukaDict };
	try {
		outputDict[order_id]["hyouka"] = intBtnNumber;

		return outputDict;
	} catch (error) {
		return {};
	}
}

function updateCommentDictHyouka(hyoukaDict, order_id, strComment) {
	var outputDict = { ...hyoukaDict };
	try {
		outputDict[order_id]["comment"] = strComment;

		return outputDict;
	} catch (error) {
		return {};
	}
}

function returnHyoukaCss(cssArray, hyoukaDict, order_id, intBtnNumber) {
	try {
		var inthyoukaNumber = parseInt(hyoukaDict[order_id]["hyouka"]);
		if (inthyoukaNumber == intBtnNumber) {
			return cssArray[0];
		} else {
			return cssArray[1];
		}
	} catch (error) {
		return cssArray[1];
	}
}

module.exports = {
	funcSearchItemWithMarker,
	funcCreateMarkerIndex4map,
	funcSortItemIsDone,
	IntCountUpOrder,
	funcCountSumOrder,
	displayStatus,
	displayOrderCountWithCancel,
	funcIsNullDataArray,
	funcIsNullDataDict,
	funcCountSumOrderPrice,
	funcSortTimes,
	createDictHyouka,
	updateDictHyouka,
	updateCommentDictHyouka,
	returnHyoukaCss,
};
