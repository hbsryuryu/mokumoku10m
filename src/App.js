import React from "react";
import { MyProvider } from "./provider/MyContext";
import MainRoute from "./route/MainRoute";
import Loader from "./firstloader/loader";

import "./css/global.css";

function App() {
	return (
		<div className="g-maxcontent">
			<MyProvider>
				<Loader />
				<div className="footerSpace"></div>
			</MyProvider>
		</div>
	);
}

export default App;
