const getCookie = (name) => {
	const matches = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
	return matches ? decodeURIComponent(matches[1]) : "";
};
const isCookie = (name) => {
	if (document.cookie.split("; ").some((cookie) => cookie.startsWith(name + "="))) {
		return true;
	} else {
		return false;
	}
};

// document.cookie = "isVisit=yes; path=/; max-age=157680000"; //セット
// document.cookie = "isVisit=yes; path=/; max-age=0"; //削除

// if (document.cookie.split("; ").some((cookie) => cookie.startsWith("session_name="))) {
// 	// クッキーが存在する場合の処理
// 	console.log("session_nameが存在します");
// 	console.log(document.cookie);
// 	console.log("削除開始します。");
// 	document.cookie = "session_name=token; path=/; max-age=0;";
// 	console.log("削除しました。");
// 	console.log(document.cookie);
// } else {
// 	return_array["googleMapApiKey"] = process.env.REACT_APP_session_name;
// 	console.log("session_nameが存在しません。");
// }

module.exports = {
	getCookie,
	isCookie,
};
