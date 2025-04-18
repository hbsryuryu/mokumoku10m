import React from "react";
import { Link } from "react-router-dom";

export const Page404 = () => {
	React.useEffect(() => {
		window.scrollTo(0, 0); // ページ遷移時にスクロール位置をトップにリセット
	}, []);
	return (
		<>
			<h1>404 NOT FOUND</h1>
			<p>お探しのページが見つかりませんでした。</p>
			<Link to="/">Topに戻る</Link>
		</>
	);
};

export default Page404;
