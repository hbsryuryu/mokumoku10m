const dayStr = ["日", "月", "火", "水", "木", "金", "土"];

function renderStrTimeDate(tStamp) {
	if (typeof tStamp === "number") {
		// UNIXTIMEを変換
		const date = new Date(tStamp * 1000); // ミリ秒基準なので、秒基準に変換
		if (!isNaN(date.getTime())) {
			tStamp = date;
		}
	}
	try {
		// return tStamp.toLocaleDateString().slice(5) + " (" + dayStr[tStamp.getDay()] + ")";
		// ゼロ埋め関数を作成
		const zeroPad = (num) => num.toString().padStart(2, "0");
		const month = zeroPad(tStamp.getMonth() + 1); // 月は0から始まるので+1
		const day = zeroPad(tStamp.getDate());

		return `${month}/${day} （${dayStr[tStamp.getDay()]}）`;
	} catch (error) {
		return "";
	}
}
function renderStrTimeTime(tStamp) {
	if (typeof tStamp === "number") {
		// UNIXTIMEを変換
		const date = new Date(tStamp * 1000); // ミリ秒基準なので、秒基準に変換
		if (!isNaN(date.getTime())) {
			tStamp = date;
		}
	}
	try {
		return tStamp.toLocaleTimeString().slice(0, -3);
	} catch (error) {
		return "";
	}
}

function renderStrYYYYMMDD(tStamp) {
	if (tStamp === 0) {
		return "";
	}
	if (typeof tStamp === "number") {
		// UNIXTIMEを変換
		const date = new Date(tStamp * 1000); // ミリ秒基準なので、秒基準に変換
		if (!isNaN(date.getTime())) {
			tStamp = date;
		}
	}
	try {
		const year = String(tStamp.getFullYear());
		const month = String(tStamp.getMonth() + 1).padStart(2, "0"); // 月は0始まりなので+1し、2桁に
		const day = String(tStamp.getDate()).padStart(2, "0"); // 日付を2桁に

		return `${year}/${month}/${day}`;
	} catch (error) {
		return "";
	}
}

function funcNowTimeStr() {
	var rightNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	return rightNow;
}

module.exports = {
	renderStrTimeDate,
	renderStrTimeTime,
	renderStrYYYYMMDD,
	funcNowTimeStr,
};
