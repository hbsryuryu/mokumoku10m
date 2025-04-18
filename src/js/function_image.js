// ファイルアップロード機構
const reader = new FileReader();
const target_px_width = 320; //5255
// const target_px_width = 1280; //28955

function uploadImg(event, cameraData, setCameraData) {
	const file = event.target.files[0];
	if (!file) return;

	// イベント設定
	reader.onload = function (e) {
		const img = new Image();
		img.src = e.target.result;
		img.onload = function () {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");

			// 正方形のため、短い辺を基準にクロップする
			const minSize = Math.min(img.width, img.height);

			// 中央部分を切り取るための開始座標を計算
			const cropX = (img.width - minSize) / 2;
			const cropY = (img.height - minSize) / 2;
			canvas.width = target_px_width;
			canvas.height = target_px_width;
			ctx.drawImage(img, cropX, cropY, minSize, minSize, 0, 0, target_px_width, target_px_width);
			const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.25); // 4055

			setCameraData(compressedDataUrl);
		};
	};
	// 設定した内容を実行
	reader.readAsDataURL(file);

	// apple製品は基本.heic形式で画像アップロードする
	// iphoneからアップロードされると自動的にjgegに変換してくれるがmacはそのままアップロードmなので注意
}

module.exports = {
	uploadImg,
};
