import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { myUrl } from "../route/MainRoute.js";

// component群
// import SupplierFooter from "../components/SupplierFooter";
// import BuyerFooter from "../components/BuyerFooter";

//css群
import "../css/onboarding.css";

const Onboarding = () => {
	const navigate = useNavigate();

	// 表示する画像の配列
	const images = [require("../img/on1.jpg"), require("../img/on2.jpg"), require("../img/on4.jpg")];

	// 現在の画像インデックスを状態として管理
	const [currentIndex, setCurrentIndex] = useState(0);
	const [startX, setStartX] = useState(0);
	const [isDragging, setIsDragging] = useState(false);

	const handleNext = () => {
		if (currentIndex < images.length - 1) {
			setCurrentIndex(currentIndex + 1);
		}
		if (currentIndex === images.length - 1) {
			document.cookie = "isVisit=yes; path=/; max-age=157680000; SameSite=goFarm";
			navigate(myUrl("b_i_find_s"));
		}
	};

	const handlePrev = () => {
		if (currentIndex > 0) {
			setCurrentIndex(currentIndex - 1);
		}
	};

	const handleMouseDown = (event) => {
		setStartX(event.clientX || event.touches[0].clientX);
		setIsDragging(true);
	};

	const handleMouseMove = (event) => {
		if (!isDragging) return;

		const currentX = event.clientX || event.touches[0].clientX;
		const diffX = currentX - startX;

		if (diffX > 50) {
			handlePrev();
			setIsDragging(false);
		} else if (diffX < -50) {
			handleNext();
			setIsDragging(false);
		}
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	return (
		<>
			<div className="slider-container">
				<div className="slider" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp}>
					<div className="slider-track" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
						{images.map((image, index) => (
							<div className="slide" key={index}>
								<img src={image} alt={`Slide ${index + 1}`} />
							</div>
						))}
					</div>
					<div className="overlay" />
				</div>
				<div className="btnPlate">
					<div className="indicators">
						{images.map((_, index) => (
							<span key={index} className={`indicator ${currentIndex === index ? "active" : ""}`} />
						))}
					</div>
					<div className="buttons">
						<button className="indicatorBtn g-btn1 g-btn1 g-btn-clr1" onClick={handleNext}>
							{currentIndex === images.length - 1 ? "はじめる" : "次へ"}
						</button>
					</div>
				</div>
			</div>
		</>
	);
};

export default Onboarding;
