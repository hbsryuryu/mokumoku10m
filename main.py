import re
import os
from fastapi import FastAPI, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles


class Data(BaseModel):
    x: int
    y: int

app = FastAPI()

# @app.get('/')
# def index():
#     return {'message': 'Hello Deta!'}

# @app.post('/')
# def calc(data: Data):
#     z = data.x+data.y
#     return {'result': z}



# ----react用動的追加----
# ----react用動的追加----
# ----react用動的追加----

# のちにファイルから抽出してもOK

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(BASE_DIR, 'build')
STATIC_DIR = os.path.join(TEMPLATES_DIR, "static")
INDEX_HTML_PATH = os.path.join(TEMPLATES_DIR, "index.html")

app = FastAPI()
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# ここのちにファイルから取得
str_urls = """
<BrowserRouter>
	<Routes>
		<Route exact path="/" element={<Top />} />
		<Route path="/onboarding" element={<Onboarding />} />
		<Route path="/supplier/list-item/registrate" element={<ItemRegistrate />} />
		<Route path="/supplier/list-item/edit" element={<ItemEdit />} />
		<Route path="/supplier/item-manage/list" element={<ItemManage />} />
		<Route path="/supplier/item-manage/pickup-time-detail" element={<ItemManagePickupTimeDetail />} />
		<Route path="/buyer/user/registrate" element={<UserRegistrate />} />
		<Route path="/buyer/find/search" element={<BuyerFindSearch />} />
		<Route path="/buyer/find/product-detail" element={<FindProductDetail />} />
		<Route path="/buyer/find/payment-method" element={<FindPaymentConfirm />} />
		<Route path="/buyer/find/payment-confirm" element={<FindPaymentConfirm />} />
		<Route path="/buyer/find/payment-complete" element={<FindPaymentComplete />} />
		<Route path="/buyer/receive-order/unreceived/list" element={<BuyerUnreceivedList />} />
		<Route path="/buyer/receive-order/unreceived/product-detail" element={<BuyerUnreceivedProductDetail />} />
		<Route path="/buyermypage" element={<BuyerMypage />} />
		<Route path="/suppliertop" element={<SupplierTop />} />
		<Route path="/suppliermypage" element={<SupplierMypage />} />
		<Route path="/suppliermypagedetail" element={<SupplierMypage />} />
		<Route path="/supplier/salesmanagement" element={<SupplierSalesManagement />} />
		<Route path="/contact-us" element={<ContactUs />} />
		<Route path="/privacy" element={<Privacy />} />
		<Route path="/tokushoho" element={<Tokushoho />} />
		<Route path="/userpublic" element={<UserPublic />} />
		<Route path="/suppliertransfer" element={<SupplierTransfer />} />
		<Route path="*" element={<Page404 />} />
		<Route path="/purchase" element={<Purchase />} />
	</Routes>
</BrowserRouter>
"""

# 正規表現でパス部分を抽出する
routes = re.findall(r'path="([^"]+)"', str_urls)

# クッキー設定
# GOOGLE_MAP_API_KEY = "your_google_map_api_key"
# IS_SECURE = True

# 動的にルートを作成
for route in routes:
    if route not in ["*", ""]:
        async def route_function(response: Response):
            # response.set_cookie(
            #     key="session_name",
            #     value=GOOGLE_MAP_API_KEY,
            #     httponly=False,
            #     secure=IS_SECURE,
            #     expires=(datetime.datetime.utcnow() + datetime.timedelta(seconds=30)).strftime("%a, %d %b %Y %H:%M:%S GMT")
            # )
            return FileResponse(INDEX_HTML_PATH)

        app.get(route)(route_function)

