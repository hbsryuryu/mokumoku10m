import React from "react";
import { MyContext } from "../provider/MyContext";
import "../css/Calendar.css";

// 再レンダリングによる上書を防止
// console.log("ここ実行");

// カレンダーコンポーネント
function RenderCalendar({ funcSetSelectTime, year, month }) {
	const generateCalendar = () => {
		const firstDayOfMonth = new Date(year, month, 1).getDay(); //曜日を取得
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const MonthOfToday = new Date().getMonth();
		const dayOfToday = new Date().getDate();
		if (MonthOfToday == month) {
			var isNowMonth = true;
		} else {
			var isNowMonth = false;
		}

		let dayCounter = 1;
		const totalCells = 35;
		const cells = Array.from({ length: totalCells }, (_, index) => {
			if (index >= firstDayOfMonth && dayCounter <= daysInMonth) {
				if (isNowMonth && dayOfToday == dayCounter) {
					var cell = (
						<td key={index} onClick={handleClick} className="calendar-cell calendar-cell-now">
							{dayCounter}
						</td>
					);
				} else {
					var cell = (
						<td key={index} onClick={handleClick} className="calendar-cell">
							{dayCounter}
						</td>
					);
				}

				dayCounter++;
				return cell;
			} else {
				return <td key={index}></td>;
			}
		});

		const rows = [];
		for (let i = 0; i < totalCells; i += 7) {
			rows.push(<tr key={i}>{cells.slice(i, i + 7)}</tr>);
		}

		return rows;
	};

	const handleClick = (e) => {
		funcSetSelectTime(e);
	};

	return (
		<table className="calendar-table">
			<thead>
				<tr>
					<th>S</th>
					<th>M</th>
					<th>T</th>
					<th>W</th>
					<th>T</th>
					<th>F</th>
					<th>S</th>
				</tr>
			</thead>
			<tbody>{generateCalendar()}</tbody>
		</table>
	);
}

const Calendar = (props) => {
	// 注意再レンダリングでここから下すべて再実行される
	React.useEffect(() => {
		window.scrollTo(0, 0); // ページ遷移時にスクロール位置をトップにリセット
	}, []);

	//MyContext.Provider経由でstateと更新用setStateをMyContextから読み込んで、
	// stateをこちら側ではstateで変数定義,setStateをこちら側ではsetStateで変数定義
	const { state, setState } = React.useContext(MyContext);

	const today = new Date();
	const currentYear = today.getFullYear();
	const currentMonth = today.getMonth();
	const currentDate = today.getDate();

	const [year, setYear] = React.useState(currentYear);
	const [month, setMonth] = React.useState(currentMonth);

	const slideLeft = () => {
		setTimeout(() => {
			const newMonth = month + 1 > 11 ? 0 : month + 1;
			const newYear = month + 1 > 11 ? year + 1 : year;
			funcunMarkselected(newMonth, newYear);
			setYear(newYear);
			setMonth(newMonth);
		}, 100); // アニメーションの時間に合わせる
	};

	const slideRight = () => {
		setTimeout(() => {
			const newMonth = month - 1 < 0 ? 11 : month - 1;
			const newYear = month - 1 < 0 ? year - 1 : year;
			funcunMarkselected(newMonth, newYear);
			setYear(newYear);
			setMonth(newMonth);
		}, 100); // アニメーションの時間に合わせる
	};
	const [selectCss, setSelectCss] = React.useState("calendar-isNow");
	const [selectEvent, setSelectEvent] = React.useState(null);
	const [selectDay, setSelectDay] = React.useState(currentDate);
	const [selectMonth, setSelectMonth] = React.useState(currentMonth);
	const [selectYear, setSelectYear] = React.useState(currentYear);
	function funcSetSelectTime(e) {
		if (selectEvent != null) {
			selectEvent.target.className = selectEvent.target.className.replace(" calendar-cell-selected", "");
		}
		setSelectEvent(e);
		setSelectDay(e.target.innerText);
		setSelectMonth(month);
		setSelectYear(year);
		e.target.className = e.target.className + " calendar-cell-selected";
		setSelectCss("calendar-isNow");
	}

	function funcunMarkselected(newMonth, newYear) {
		// レンダリングの前にcss変更
		if (currentYear == newYear && currentMonth == newMonth) {
			setSelectCss("calendar-isNow");
		} else {
			setSelectCss("calendar-isNotNow");
		}
	}

	// useState フックで時間の状態を管理
	const [selectedTimeS, setSelectedTimeS] = React.useState("00:00");
	const [selectedTimeE, setSelectedTimeE] = React.useState("00:00");

	function funcReSetSelectTime() {
		if (selectEvent != null) {
			selectEvent.target.className = selectEvent.target.className.replace(" calendar-cell-selected", "");
		}
		setSelectEvent(null);
		setSelectDay(0);
		setSelectMonth(0);
		setSelectYear(0);
		setSelectedTimeS("00:00");
		setSelectedTimeE("00:00");
	}
	// input の onChange イベントハンドラー
	const handleTimeChangeS = (e) => {
		setSelectedTimeS(e.target.value); //xx:yyの文字列
		if (selectedTimeE == "00:00") {
			setSelectedTimeE(e.target.value);
		} else if (selectedTimeE.split(":")[1] == "00") {
			setSelectedTimeE(e.target.value);
		} else if (selectedTimeS != "00:00") {
			var isOverWrite = false;
			var timeArrayS = selectedTimeS.split(":");
			var timeArrayE = selectedTimeE.split(":");

			if (parseInt(timeArrayS[0]) > parseInt(timeArrayE[0])) {
				isOverWrite = true;
			} else if (parseInt(timeArrayS[0]) < parseInt(timeArrayE[0])) {
				isOverWrite = false;
			} else if (parseInt(timeArrayS[1]) > parseInt(timeArrayE[1])) {
				isOverWrite = true;
			}
			if (isOverWrite) {
				setSelectedTimeE(e.target.value);
			}
		}
	};
	const handleTimeChangeE = (e) => {
		setSelectedTimeE(e.target.value); // 入力された時間を状態にセット
	};

	function calGetDay() {
		var dayNumber = new Date(selectYear, selectMonth, selectDay).getDay();
		var dayStr = ["日", "月", "火", "水", "木", "金", "土"];
		return dayStr[dayNumber];
	}

	function returnAndSet() {
		// 複数入力防止
		document.getElementById("btnReturnCalendar").disabled = true;
		returnAndSetPh2();
	}
	function intSelectedTime2unix(selectedTime) {
		const selectedTimeDate = new Date(selectYear, selectMonth, selectDay, parseInt(selectedTime.split(":")[0]), parseInt(selectedTime.split(":")[1]));
		return Math.floor(selectedTimeDate / 1000);
	}
	function returnAndSetPh2() {
		var isError = false;
		var isSufficient = true;
		var returnDict = {};

		// データ入力
		returnDict["localTimeId"] = props.placeArrayCount; //配列数とidが一致する

		try {
			returnDict["start_ts"] = intSelectedTime2unix(selectedTimeS);
			returnDict["end_ts"] = intSelectedTime2unix(selectedTimeE);
		} catch (error) {
			isError = true;
		}

		// 入力検査
		// if (selectedTimeS == "00:00" && selectedTimeE == "00:00") {
		// 	isSufficient = false;
		// }

		// エラー検査と実行
		if (!isError && isSufficient) {
			props.pushPlaceArray(returnDict);
			document.getElementById("btnReturnCalendar").disabled = false;
		} else if (!isSufficient) {
			alert("必要情報を入力してください。");
			document.getElementById("btnReturnCalendar").disabled = false;
		} else {
			alert("エラーが起きました！");
			document.getElementById("btnReturnCalendar").disabled = false;
		}
	}
	return (
		<>
			<p className="c36-p1">受渡日</p>
			<p className="c36-p5">
				{selectYear}/{selectMonth + 1}/{selectDay} {"(" + calGetDay() + ")"}
			</p>
			<div>
				<div className="calendar-wrapper">
					<div className="calendar-container">
						<div className="calendar-container-space">
							<div className={selectCss}>
								<div className="calendar-navigation">
									<p>{`${year}年 ${["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"][month]}`}</p>
									<button className="c36-btn13" onClick={slideRight}>
										　
									</button>
									<button className="c36-btn14" onClick={slideLeft}>
										　
									</button>
								</div>
								<RenderCalendar funcSetSelectTime={funcSetSelectTime} year={year} month={month} />
							</div>
						</div>
					</div>
				</div>
			</div>

			<p className="c36-p1">受渡時間</p>
			<div className="c36-div8">
				<label htmlFor="calendar-timeInput1" className="calendar-p1">
					{/* <span>{selectedTimeS.split(":")[0]}</span> <span>{selectedTimeS.split(":")[1]}</span> */}
					<input id="calendar-timeInput1" type="time" value={selectedTimeS} onChange={handleTimeChangeS} />
				</label>
				～
				<label htmlFor="calendar-timeInput2" className="calendar-p1">
					{/* <span>{selectedTimeE.split(":")[0]}</span> <span>{selectedTimeE.split(":")[1]}</span> */}
					<input id="calendar-timeInput2" type="time" value={selectedTimeE} onChange={handleTimeChangeE} />
				</label>
			</div>
			<div className="c36-div9">
				<button id="btnReturnCalendar" onClick={returnAndSet}>
					追加
				</button>
			</div>
		</>
	);
};

export default Calendar;
