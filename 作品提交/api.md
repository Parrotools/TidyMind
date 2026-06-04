AI能力列表
vivo为本次AIGC竞赛应用赛道的参赛队伍提供了以下AI能力：

能力名称	应用范围	能力类型
大模型	内容创作、知识问答、逻辑推理、代码生成、信息提取	云端api
图片生成	文生图、图生图、风格转换、智能扩图/消除	云端api
视频生成	文生视频、图生视频、视频风格化、动态照片生成	云端api
通用OCR	文档电子化、智能批改/阅卷、拍照或截图识别、文本审核与管理	云端api
实时短语音识别	语音搜索、聊天输入、游戏娱乐、人机交互	云端api
方言自由说	方言自由说	云端api
同声传译	同声传译	云端api
长语音听写	视频字幕、实时会议记录、智能外呼&客服	云端api
长语音转写	电话客服、会议记录、字幕生成、语音质检	云端api
音频生成	有声阅读、新闻播报、电话客服、信息播报、出行导航	云端api
超拟人音色	超拟人音色	云端api
声音复制	声音复刻	云端api
文本翻译	文档电子化、智能批改/阅卷、拍照或截图识别、文本审核与管理	云端api
文本向量	信息推荐、文档检索、知识挖掘	云端api
文本相似度	文本相似度	云端api
查询改写	查询改写	云端api
地理编码(POI搜索)	生活购物、旅游规划	云端api


入流程

/作品提交/
更新时间：2026-03-16 04:10:23

AppKEY获取
官网地址: https://aigc.vivo.com.cn/#/platform

image.png

使用
从AIGC官网中获取AppKey，替换接口文档中的AppKey，即可使用当前脚本能力。

参数	类型	是否必须	值
Authorization	String	是	Bearer AppKey
异常说明
若鉴权失败，接口将返回HTTP 401状态码，常见错误及解决方式如下：

响应体内容	说明	解决方法
{"message":"missing required app_id in the request header"}	认证串格式或内容无效	检查请求头是否正确携带AppKey
{"message":"invalid api-key"}	app_key无效	检查app_key是否正确
{"message":"not having this ability, you need to apply for it"}	当前应用没有该能力	联系系统管理员
参考示例
#!/usr/bin/env python
# encoding: utf-8

import requests
import base64
import uuid

# 请注意替换AppKey、PIC_FILE
AppKey = "your_AppKey"
DOMAIN = 'api-ai.vivo.com.cn'
URI = '/ocr/general_recognition'
METHOD = 'POST'
PIC_FILE = './test.jpg'


def ocr_test():
picture = PIC_FILE
with open(picture, "rb") as f:
b_image = f.read()
image = base64.b64encode(b_image).decode("utf-8")
post_data = {"image": image, "pos": 2, "businessid": "aigc"+AppId}
params = {
"requestId": str(uuid.uuid4())
}
print(params['requestId'])
headers = {
# 注意该鉴权头的格式
"Authorization": f"Bearer {AppKey}",
"Content-type": "application/x-www-form-urlencoded",
}
url = 'http://{}{}'.format(DOMAIN, URI)
response = requests.post(url, data=post_data, headers=headers,params=params, timeout=3)
if response.status_code == 200:
print(response.json())
else:
print(response.status_code, response.text)


if __name__ == '__main__':
test()


文档中心/接口文档/文本生成/大模型

大模型

更新时间：2026-04-15 04:53:29

接口说明
接口说明：该接口支持主流OpenAI协议格式、Responses API协议格式，以及三方自定义协议格式。

访问地址：https://api-ai.vivo.com.cn/v1/chat/completions

请求方式：POST

请求头：
参数	类型	是否必须	值
Content-Type	string	是	application/json
Authorization	String	是	Bearer AppKey
请求参数：
参数	类型	是否必须	值
requestId	uuid	是	uuid
body参数
通用参数
参数	子参数	是否必须	类型	参数值
model		是	String	Volc-DeepSeek-V3.2
Doubao-Seed-2.0-mini
Doubao-Seed-2.0-lite
Doubao-Seed-2.0-pro
qwen3.5-plus
messages		否	object
role	是	String	发送消息的角色
可选角色：system, user
content	是	String / object	系统消息的内容
stream		否	bool	True：流式调用，False：非流式调用
max_tokens		否	integer	模型回答最大长度（单位 token）不包含思考内容。
默认值 4096
max_completion_tokens		否	integer	取值范围：[0, 65,536]
控制模型输出的最大长度（包括模型回答和模型思维链内容长度，单位 token）
reasoning_effort		否	String	限制思考的工作量。减少思考深度可提升速度，思考花费的 token 更少。
minimal：关闭思考，直接回答。 （默认）
low：轻量思考，侧重快速响应
medium：均衡模式，兼顾速度与深度。
high：深度分析，处理复杂问题。
temperature		否	float	取值范围[0 , 2 ] , 默认值1
top_p		否	float	默认值0.7
深度思考		否		模型：Volc-DeepSeek-V3.2 （默认 disabled）、Doubao-Seed-2.0-mini （默认 enabled）、Doubao-Seed-2.0-lite（默认 enabled）、Doubao-Seed-2.0-pro（默认 enabled）
字段：thinking.type ： "enable"

类型：String
enabled：开启思考模式，模型强制先思考再回答。
disabled：关闭思考模式，模型直接回答问题，不进行思考。

模型： qwen3.5-plus（默认 true）
字段：enable_thinking
类型：bool
设为true时：模型在思考后回复；
设为false时：模型直接回复；
frequency_penalty		否	float	取值范围为 [-2.0, 2.0]
频率惩罚系数。如值为正，根据新 token 在文本中的出现频率对其进行惩罚，从而降低模型逐字重复的可能性。
presence_penalty		否	float	取值范围为 [-2.0, 2.0]
存在惩罚系数。如果值为正，会根据新 token 到目前为止是否出现在文本中对其进行惩罚，从而增加模型谈论新主题的可能性。
tools		否		示例：
[
{
“type”: “function”,
“function”: {
“name”: “get_current_weather”,
“description”: “当你想查询指定城市的天气时非常有用。”,
“parameters”: {
“type”: “object”,
“properties”: {
“location”: {
“type”: “string”,
“description”: “城市或县区，比如北京市、杭州市、余杭区等。”
}
},
“required”: [
“location”
]
}
}
}
]
请求示例
curl格式

默认

curl https://api-ai.vivo.com.cn/v1/chat/completions \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $AppKey" \
-d '{
"model": "Volc-DeepSeek-V3.2",
"messages": [
{
"role": "system",
"content": "You are a helpful assistant."
},
{
"role": "user",
"content": "Hello!"
}
]
}'
流式

curl https://api-ai.vivo.com.cn/v1/chat/completions \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $AppKey" \
-d $'{
"messages": [
{
"content": "You are a helpful assistant.",
"role": "system"
},
{
"content": "hello",
"role": "user"
}
],
"model": "Volc-DeepSeek-V3.2",
"stream": true
}'

图片理解

curl https://api-ai.vivo.com.cn/v1/chat/completions \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $AppKey" \
-d $'{
"model": "Volc-DeepSeek-V3.2",
"messages": [
{
"content": [
{
"image_url": {
"url": "https://ark-project.tos-cn-beijing.volces.com/images/view.jpeg"
},
"type": "image_url"
},
{
"text": "图片主要讲了什么?",
"type": "text"
}
],
"role": "user"
}
]
}'

python-openai库

同步请求

import uuid

import requests
from openai import OpenAI

AppKey = "your_AppKey"
BASE_URL = "https://api-ai.vivo.com.cn/v1"
MODEL_NAME = "Doubao-Seed-2.0-mini"

request_id = str(uuid.uuid4())
client = OpenAI(
api_key=AppKey,
base_url=BASE_URL,
default_headers={
"Content-Type": "application/json; charset=utf-8"
},
default_query={"request_id": request_id}
)


def sync_chat():
try:
response = client.chat.completions.create(
model=MODEL_NAME,
messages=[
{"role": "user", "content": "你好，请介绍下你自己"}
],
temperature=0.7,
max_tokens=1024,
stream=False,
)
content = response.choices[0].message.content
print(f"回复内容：{content}")
return content
except Exception as e:
print(f"请求出错，request_id={request_id}，错误信息：{str(e)}")


if __name__ == "__main__":
sync_chat()
流式请求

import uuid
from openai import OpenAI

AppKey = "your_AppKey"
BASE_URL = "https://api-ai.vivo.com.cn/v1"
MODEL_NAME = "Doubao-Seed-2.0-mini"


client = OpenAI(
api_key=AppKey,
base_url=BASE_URL,
default_headers={
"Content-Type": "application/json; charset=utf-8"
},
default_query={"request_id": request_id}
)

def stream_chat():
request_id = str(uuid.uuid4())
try:
response = client.chat.completions.create(
model=MODEL_NAME,
messages=[
{"role": "user", "content": "你好，请介绍下你自己"}
],
temperature=0.7,
max_tokens=1024,
stream=True,
stream_options={"include_usage": True}           
)

        full_content = ""
        usage = None
        print("流式输出：\n")
        for chunk in response:
            if hasattr(chunk, 'usage') and chunk.usage:
                usage = chunk.usage
                continue
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta.content
            if delta:
                full_content += delta
                print(delta, end="", flush=True)
        print(f"\n\n===== 完整回复 =====\n{full_content}")
        if usage:
            print(f"\n===== Token消耗 =====\n输入：{usage.prompt_tokens}\n输出：{usage.completion_tokens}\n总计：{usage.total_tokens}")
        return full_content

    except Exception as e:
        print(f"请求出错，request_id={request_id}，错误信息：{str(e)}")


if __name__ == "__main__":
stream_chat()

图片理解

import uuid
import base64
from openai import OpenAI

# 配置参数
AppKey = "your_AppKey"
BASE_URL = "https://api-ai.vivo.com.cn/v1"
MODEL_NAME = "Volc-DeepSeek-V3.2"

client = OpenAI(
api_key=AppKey,
base_url=BASE_URL,
default_headers={
"Content-Type": "application/json; charset=utf-8"
},
default_query={"request_id": request_id}
)

# 本地图片转base64工具函数，传本地图时使用
def image_to_base64(image_path):
with open(image_path, "rb") as f:
base64_str = base64.b64encode(f.read()).decode("utf-8")
return f"data:image/jpeg;base64,{base64_str}"

def sync_image_chat():
request_id = str(uuid.uuid4())
try:
response = client.chat.completions.create(
model=MODEL_NAME,
messages=[
{
"role": "user",
"content": [
{"type": "text", "text": "请描述这张图片里的内容，越详细越好"},
{"type": "image_url", "image_url": {
# 方式1：在线公共图片URL
"url": "https://lf3-static.bytednsdoc.com/obj/eden-cn/ptlz_zlp/ljhwZthlaukjlkulzlp/root-web-sites/doubao_intro.png"
# 方式2：本地图片转base64（需要取消下行注释并注释掉上方URL）
# 需注意：传入Base64编码遵循格式 data:image/<IMAGE_FORMAT>;base64,{base64_image}：
# PNG图片："url":  f"data:image/png;base64,{base64_image}"
# JPEG图片："url":  f"data:image/jpeg;base64,{base64_image}"
# WEBP图片："url":  f"data:image/webp;base64,{base64_image}"
# "url":  f"data:image/<IMAGE_FORMAT>;base64,{base64_image}"
# "url": image_to_base64("./test.jpg")
}}
]
}
],
temperature=0.3,
max_tokens=2048,
stream=False,

        )
        content = response.choices[0].message.content
        usage = response.usage

        print(f"===== 图片解析结果 =====\n{content}")
        print(f"\n===== Token消耗 =====\n输入：{usage.prompt_tokens}\n输出：{usage.completion_tokens}\n总计：{usage.total_tokens}")
        return content

    except Exception as e:
        print(f"请求出错，request_id={request_id}，错误信息：{str(e)}")

if __name__ == "__main__":
sync_image_chat()

python-requests库

同步请求

import uuid
import requests

AppKey = "your_AppKey"
BASE_URL = "https://api-ai.vivo.com.cn/v1"
MODEL_NAME = "Doubao-Seed-2.0-mini"

request_id = str(uuid.uuid4())


def sync_chat():
url = f"{BASE_URL}/chat/completions"
headers = {
"Content-Type": "application/json; charset=utf-8",
"Authorization": f"Bearer {AppKey}"
}
params = {
"request_id": request_id
}
payload = {
"model": MODEL_NAME,
"messages": [
{"role": "user", "content": "你好，请介绍下你自己"}
],
"temperature": 0.7,
"max_tokens": 1024,
"stream": False
}

    try:
        response = requests.post(
            url,
            headers=headers,
            params=params,
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        response_data = response.json()
        content = response_data['choices'][0]['message']['content']
        print(f"回复内容：{content}")
        return content

    except Exception as e:
        print(f"请求出错，request_id={request_id}，错误信息：{str(e)}")
        if 'response' in locals() and response is not None:
            print(f"详细错误响应：{response.text}")


if __name__ == "__main__":
sync_chat()

流式请求

import uuid
import requests
import json

AppKey = "your_AppKey"
BASE_URL = "https://api-ai.vivo.com.cn/v1"
MODEL_NAME = "Doubao-Seed-2.0-mini"

request_id = str(uuid.uuid4())


def stream_chat():
url = f"{BASE_URL}/chat/completions"
headers = {
"Content-Type": "application/json; charset=utf-8",
"Authorization": f"Bearer {AppKey}"
}
params = {
"request_id": request_id
}
payload = {
"model": MODEL_NAME,
"messages": [
{"role": "user", "content": "你好，请介绍下你自己，并计算一下9.9和9.11哪个大"}
],
"temperature": 0.7,
"max_tokens": 1024,
"stream": True
}

    try:
        response = requests.post(
            url,
            headers=headers,
            params=params,
            json=payload,
            timeout=30,
            stream=True
        )
        response.raise_for_status()

        full_thought = ""  # 用于拼接完整思考过程
        full_content = ""  # 用于拼接完整回复内容

        has_printed_thought_header = False
        has_printed_content_header = False

        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                if decoded_line.startswith("data:"):
                    data_str = decoded_line.replace("data:", "", 1).strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        data_json = json.loads(data_str)
                        delta = data_json.get('choices', [{}])[0].get('delta', {})
                        thought_piece = delta.get('reasoning_content', "")
                        if thought_piece:
                            if not has_printed_thought_header:
                                print("\n🤔 思考过程：\n", end="", flush=True)
                                has_printed_thought_header = True

                            print(thought_piece, end="", flush=True)
                            full_thought += thought_piece
                        content_piece = delta.get('content', "")
                        if content_piece:
                            if not has_printed_content_header:
                                print("\n\n🤖 回复内容：\n", end="", flush=True)
                                has_printed_content_header = True

                            print(content_piece, end="", flush=True)
                            full_content += content_piece

                    except json.JSONDecodeError:
                        pass

        print()
        return {
            "thought": full_thought,
            "content": full_content
        }

    except Exception as e:
        print(f"\n请求出错，request_id={request_id}，错误信息：{str(e)}")
        if 'response' in locals() and response is not None:
            try:
                print(f"详细错误响应：{response.text}")
            except:
                pass


if __name__ == "__main__":
result = stream_chat()
图片理解

import uuid
import base64
import requests

# 配置参数
AppKey = "your_AppKey"  # 请替换为你自己的 AppKey
BASE_URL = "https://api-ai.vivo.com.cn/v1"
MODEL_NAME = "Doubao-Seed-2.0-mini"

# 本地图片转base64工具函数，传本地图时使用
def image_to_base64(image_path):
with open(image_path, "rb") as f:
base64_str = base64.b64encode(f.read()).decode("utf-8")
return f"data:image/jpeg;base64,{base64_str}"

def sync_image_chat():
request_id = str(uuid.uuid4())
url = f"{BASE_URL}/chat/completions"

    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": f"Bearer {AppKey}"
    }
    
    params = {
        "request_id": request_id
    }
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "请描述这张图片里的内容，越详细越好"},
                    {
                        "type": "image_url",
                        "image_url": {
                            # 方式1：在线公共图片URL
                            "url": "https://lf3-static.bytednsdoc.com/obj/eden-cn/ptlz_zlp/ljhwZthlaukjlkulzlp/root-web-sites/doubao_intro.png"
                            
                            # 方式2：本地图片转base64（需要取消下行注释并注释掉上方URL）
                             # 需注意：传入Base64编码遵循格式 data:image/<IMAGE_FORMAT>;base64,{base64_image}：
                              # PNG图片："url":  f"data:image/png;base64,{base64_image}"
                              # JPEG图片："url":  f"data:image/jpeg;base64,{base64_image}"
                              # WEBP图片："url":  f"data:image/webp;base64,{base64_image}"
                              # "url":  f"data:image/<IMAGE_FORMAT>;base64,{base64_image}"
                            # "url": image_to_base64("./test.jpg")
                        }
                    }
                ]
            }
        ],
        "temperature": 0.3,
        "max_tokens": 2048,
        "stream": False
    }

    try:
        response = requests.post(
            url,
            headers=headers,
            params=params,
            json=payload,
            timeout=60
        )
        response.raise_for_status()
        response_data = response.json()
        content = response_data['choices'][0]['message']['content']
        usage = response_data.get('usage', {})

        print(f"===== 图片解析结果 =====\n{content}")
        print(f"\n===== Token消耗 =====\n"
              f"输入：{usage.get('prompt_tokens', 0)}\n"
              f"输出：{usage.get('completion_tokens', 0)}\n"
              f"总计：{usage.get('total_tokens', 0)}")
              
        return content

    except Exception as e:
        print(f"\n请求出错，request_id={request_id}，错误信息：{str(e)}")
        if 'response' in locals() and response is not None:
            try:
                print(f"详细错误响应：{response.text}")
            except:
                pass

if __name__ == "__main__":
sync_image_chat()

响应示例
同步请求

{
"choices": [
{
"finish_reason": "stop",
"index": 0,
"logprobs": null,
"message": {
"content": "很抱歉呀，我没办法获取实时的日期和时间呢。你可以直接查看手机、电脑的状态栏或者日历应用来确认今天是星期几哦。如果需要我帮你推算特定日期对应的星期几，可以告诉我具体的日期和时区~",
"reasoning_content": "用户现在问今天星期几，首先我需要说明我没办法获取实时的日期和时间哦，因为我的数据截止到2023年10月，而且没有实时联网的功能。然后可以告诉用户怎么看自己设备上的时间，比如手机、电脑的状态栏之类的。还要友好一点，比如如果用户需要确认具体日期的话，可以告诉我所在的时区或者大概的日期范围，我可以帮忙推算？不对，首先先明确，我没有实时数据，所以先解释清楚，然后给出建议。比如：“很抱歉呀，我没办法获取实时的日期和时间呢。你可以直接查看手机、电脑的状态栏或者日历应用来确认今天是星期几哦。如果需要我帮你推算特定日期对应的星期几，可以告诉我具体的日期和时区~” 对，这样应该就可以了，语气友好一点，符合豆包的设定。",
"role": "assistant"
}
}
],
"created": 1773715271,
"id": "0217737152674454577c52c8dbdc08ff5e13b330e16e209c24544",
"model": "doubao-seed-2.0-mini",
"service_tier": "default",
"object": "chat.completion",
"usage": {
"completion_tokens": 242,
"prompt_tokens": 55,
"total_tokens": 297,
"prompt_tokens_details": {
"cached_tokens": 0
},
"completion_tokens_details": {
"reasoning_tokens": 189
}
}
}
流式请求

{"choices":[{"delta":{"content":"Hello","role":"assistant"},"index":0}],"created":1742632436,"id":"021742632435712396f12d018b5d576a7a55349c2eba0815061fc","model":"doubao-1-5-pro-32k-250115","service_tier":"default","object":"chat.completion.chunk","usage":null}

{"choices":[{"delta":{"content":"!","role":"assistant"},"index":0}],"created":1742632436,"id":"021742632435712396f12d018b5d576a7a55349c2eba0815061fc","model":"doubao-1-5-pro-32k-250115","service_tier":"default","object":"chat.completion.chunk","usage":null}

{"choices":[{"delta":{"content":" How","role":"assistant"},"index":0}],"created":1742632436,"id":"021742632435712396f12d018b5d576a7a55349c2eba0815061fc","model":"doubao-1-5-pro-32k-250115","service_tier":"default","object":"chat.completion.chunk","usage":null}

{"choices":[{"delta":{"content":" can","role":"assistant"},"index":0}],"created":1742632436,"id":"021742632435712396f12d018b5d576a7a55349c2eba0815061fc","model":"doubao-1-5-pro-32k-250115","service_tier":"default","object":"chat.completion.chunk","usage":null}

{"choices":[{"delta":{"content":" I","role":"assistant"},"index":0}],"created":1742632436,"id":"021742632435712396f12d018b5d576a7a55349c2eba0815061fc","model":"doubao-1-5-pro-32k-250115","service_tier":"default","object":"chat.completion.chunk","usage":null}

{"choices":[{"delta":{"content":" help","role":"assistant"},"index":0}],"created":1742632436,"id":"021742632435712396f12d018b5d576a7a55349c2eba0815061fc","model":"doubao-1-5-pro-32k-250115","service_tier":"default","object":"chat.completion.chunk","usage":null}

{"choices":[{"delta":{"content":" you","role":"assistant"},"index":0}],"created":1742632436,"id":"021742632435712396f12d018b5d576a7a55349c2eba0815061fc","model":"doubao-1-5-pro-32k-250115","service_tier":"default","object":"chat.completion.chunk","usage":null}

{"choices":[{"delta":{"content":" today","role":"assistant"},"index":0}],"created":1742632436,"id":"021742632435712396f12d018b5d576a7a55349c2eba0815061fc","model":"doubao-1-5-pro-32k-250115","service_tier":"default","object":"chat.completion.chunk","usage":null}

{"choices":[{"delta":{"content":"?","role":"assistant"},"index":0}],"created":1742632436,"id":"021742632435712396f12d018b5d576a7a55349c2eba0815061fc","model":"doubao-1-5-pro-32k-250115","service_tier":"default","object":"chat.completion.chunk","usage":null}

{"choices":[{"delta":{"content":"","role":"assistant"},"finish_reason":"stop","index":0}],"created":1742632436,"id":"021742632435712396f12d018b5d576a7a55349c2eba0815061fc","model":"doubao-1-5-pro-32k-250115","service_tier":"default","object":"chat.completion.chunk","usage":null}

[DONE]
常见问题
错误码说明
code	错误信息	备注
1001	param ‘requestId’ can’t be empty 等等	参数异常，通常是缺少必填参数
1007	抱歉，xxx	触发审核后系统干预返回的内容
30001	no model access permission permission expires	没有访问权限，或者权限到期，请联系官网客服
30001	hit model rate limit	触发模型 QPS 限流，请降低请求频率
2003	today usage limit	触发单日用量限制，请次日再重试
限流问题
触发限流后，data为null，msg为429或inner error，如果业务需要对触发限流没有返回结果的文本重新请求取得结果，建议增加重试机制，并且是间隔一段时间重试，但无法保证重试一定成功。注意代码逻辑正确性，不要出现无限重试的情况。

messages如何使用？
messages中必须前面user和assistant成对出现，最后再加一个user。前面的user和assistant对表示用户的历史对话内容，历史对话内容可以是多轮，最后一个user表示最新一次用户的输入，只能有一个。一轮历史对话内容加最新输入的示例格式如下，按此格式扩展即可：

"messages": [
{
"role": "user",
"content": "你是谁？"
},
{
"role": "assistant",
"content": "你好，我是蓝心小V，你的虚拟伙伴和闲聊好友。无论你心情如何，希望与你分享的话题有多么轻松或深奥，我都在这里随时准备和你聊上几句。所以，告诉我，今天的你，想要开始我们的对话从哪里呢？"
},
{
"role": "user",
"content": "你会做什么？"
}
]


Function calling

更新时间：2026-03-16 07:52:35

Function Call使用指南
Messages说明
直接调用API的话，需要用户自己封装system和解析数据。

Function call需要使用messages来进行调用，messages为一个列表，包含一条或者多条消息，一个完整的function call的messages示例如下：

[
{'role':'system','content':'''你是一个AI助手，尽你所能回答用户的问题。

你可以使用的工具如下:
<APIs>
[
{
"name": "get_current_weather",
"description": "Get the current weather",
"parameters": {
"type": "object",
"properties": {
"location": {
"type": "string",
"description": "The city and state, e.g. San Francisco, CA",
},
"format": {
"type": "string",
"enum": ["celsius", "fahrenheit"],
"description": "The temperature unit to use. Infer this from the users location.",
},
},
"required": ["location", "format"],
},
}
]
</APIs>

如果用户的问题需要调用工具，输出格式为：
<APIs>
[{"name": "函数名","parameters": {"参数名": "参数"}}]
</APIs>
否则直接回复用户。'''},
{'role':'user','content':'杭州天气怎么样'},
{"role":'assistant','content':'<APIs>[{"name": "get_current_weather", "parameters": {"location": "Hangzhou", "format": "celsius"}}]</APIs>'},
{'role':'function','content':'杭州天气晴，27度'},
{"role":'assistant','content':'您好，杭州天气晴朗，27度，祝您有个好心情。'}
]
每一条message为字典结构，包含role和content两个字段，其中role为角色，content为对应的内容。

角色	说明	举例
system	系统角色，可以用于指定人设、回复格式、API说明、额外知识等内容。可以放任何你想让模型知道的内容。	你是蓝心小V，请你用萌妹子的口吻回复用户。
user	用户的输入内容	你好
assistant	大模型的回复，function call也是在这里	[{“name”: “get_current_weather”, “parameters”: {“location”: “Hangzhou”, “format”: “celsius”}}]
function	function调用结果，如果模型输出了function call，开发者需要将function call的结果通过这个角色给到大模型	杭州天气晴，27度
System构成
一个基本的function call的system包含的信息如下，只需要将您的api定义替换掉{api_desc}即可。

3-12行为固定格式，建议保持一致。

角色和功能说明 system：填入您自定义的system内容

APIs：API的说明，后面会详细介绍

格式返回说明：要求模型返回结构化的字段，包括回复和function call两个信息，二者只会有一个有值。建议先用默认格式，因为训练数据中大部分都为这种格式。

这块比较核心，如果没有指定返回格式，则无法判断何时为function call何时为正常回复
如果有额外的信息需要模型知道，请参考LUI格式使用格式将信息放在角色和功能说明中

你是xxxx，你可以xxxx

用户的信息如下：
<Knowledge>
姓名：小白
年龄：33
爱好：看书、跑步
</Knowledge>

你需要xxxxx

你可以使用的工具如下:
...
否则直接回复用户。
API定义
API推荐使用json格式。

使用Json格式定义API的好处

- 训练数据中大部分API都是采用Json格式定义，因此，在使用时采用和训练一致的API格式可以更好保证效果

- 业界统一使用Json格式的API定义，如OpenAI，Claude，智谱等，方便切换接口，或者使用其他接口构建数据

如下例：

{
"name": "get_current_weather",
"description": "Get the current weather",
"parameters": {
"type": "object",
"properties": {
"location": {
"type": "string",
"description": "The city and state, e.g. San Francisco, CA",
},
"format": {
"type": "string",
"enum": ["celsius", "fahrenheit"],
"description": "The temperature unit to use. Infer this from the users location.",
},
},
"required": ["location", "format"],
},
}
每个API说明包含3个必须的字段：

name: API的名称，最终模型返回时会使用这个name
description: API的说明，说明这个API的功能和作用，也可以包含API的限制，以及一些示例
parameters: API的参数，核心是properties，包含了参数名称(key)，和参数的类型和说明（value）。required指定哪些是必须的参数。
参考：

https://platform.openai.com/docs/api-reference/chat/create#chat-create-tools
https://docs.anthropic.com/claude/docs/tool-use#specifying-tools
https://open.bigmodel.cn/dev/howuse/functioncall

图片生成

更新时间：2026-04-29 03:47:04

接口说明
接口说明：该接口提供图片生成能力，可根据输入的文本或图片生成图片

访问地址：https://api-ai.vivo.com.cn/api/v1/image_generation

限制说明：初赛期间每天限制提交10次图片生成任务，总共限制提交300次任务，请勿滥用接口

请求参数
请求头

参数	类型	是否必须	值
Content-Type	string	是	application/josn
Authorization	String	是	Bearer AppKey
URL参数

参数	类型	说明	是否必填	备注
module	string	模块名称	是	填写“aigc"
request_id	string	请求id	是	使用uuid
system_time	int	时间戳	是	请求时的Unix时间戳，以秒为单位
Body参数

参数	类型	说明	是否必填	备注
model	string	模型名称	是	Doubao-Seedream-4.5
prompt	string	文本	是
image	string/list	图片链接/图片base64编码	否	单张图使用url或base64编码，多张图使用[url, url]或[base64, base64]
（1）图片URL：请确保图片URL有效且可被访问。
（2）base64编码：请遵循此格式data:image/<图片格式>;base64,<Base64编码>。注意<图片格式>需小写，如data:image/png;base64,<base64_image>
parameters	object	其它参数	否	其他额外支持的参数放到parameters中
↳ size	string	图像分辨率	否	指定生成图片的尺寸或分辨率。
↳ sequential_image_generation	string	组图开关	否	默认 disabled。选值：auto (自动生成组图), disabled (单图)。
↳ sequential_image_generation_options	object	组图配置	否	组图功能的配置项，仅当 sequential_image_generation 为 auto 时生效。
请求body示例
1.文生图

{
"model": "Doubao-Seedream-4.5",
"prompt": "一张温暖的日落海边照片，细节丰富，自然色彩"
}
2.文生图（指定分辨率）

{
"model": "Doubao-Seedream-4.5",
"prompt": "梦幻森林场景，光束穿透树冠，超清细节",
"parameters": {
"size": "2K"
}
}
3.文生图（使用base64编码）

{
"model": "Doubao-Seedream-4.5",
"prompt": "画一个少女骑自行车的图片",
"image": "data:image/webp;base64,UklGRrqAAABXRUJ******XlmUQG6Y0szwqYAAAA==",
"parameters": {
"prompt_extend": false,
"size": "2K"
}  
}
4.图生图

{
"model": "Doubao-Seedream-4.5",
"prompt": "将参考图片转换成油画风格，同时保持主体构图一致",
"image": "https://example.com/reference.jpg",
"parameters": {
"size": "2048x2048",
"watermark": false
}
}
响应结果
响应header

字段	类型	说明
Content-Type	string	application/json
响应Body

参数	类型	说明	是否必填	备注
code	int	错误码	是	0为响应正常，其它表示异常
message	string	错误信息	是
trace_id	string	追溯id	是	用于排查问题
data	object	响应数据	是
-image	string	图片链接	是	即将废弃，生成的图片建议统一从images中获取（2026/04/13更新）
-images	list	生成的图片列表	是
–url	string	图片链接	是
–size	string	图片大小	是
-finish_reason	string	结束原因	是
-usage	object	输出信息	是
–image_count	int	生成图片数量	是
–width	int	图片宽度	是
–height	int	图片高度	是
–input_tokens	int	输入tokens	否
–output_tokens	int	输出tokens	否
–total_tokens	int	总tokens	否
-provider_request_id	string	模型侧响应id	是
正常响应示例

1.响应单张图

{
"code": 0,
"message": "success",
"trace_id": "4880ae91-c429-4a70-ae67-1ffe6eaca958",
"data": {
"image": "https://ark-content-generation-v2-cn-beijing.tos-cn-beijing.volces.com/doubao-seedream-4-5/021775716043487a1f159c8749400f11e6b8ebd4b19bd2e1b4edd_0.jpeg?X-Tos-Algorithm=TOS4-HMAC-SHA256&X-Tos-Credential=AKLTYWJkZTExNjA1ZDUyNDc3YzhjNTM5OGIyNjBhNDcyOTQ%2F20260409%2Fcn-beijing%2Ftos%2Frequest&X-Tos-Date=20260409T062732Z&X-Tos-Expires=86400&X-Tos-Signature=8387f70531f2426287e2cf19eea1db225441aacbd27ca43133d55c19da804de7&X-Tos-SignedHeaders=host",
"images": [
{
"url": "https://ark-content-generation-v2-cn-beijing.tos-cn-beijing.volces.com/doubao-seedream-4-5/021775716043487a1f159c8749400f11e6b8ebd4b19bd2e1b4edd_0.jpeg?X-Tos-Algorithm=TOS4-HMAC-SHA256&X-Tos-Credential=AKLTYWJkZTExNjA1ZDUyNDc3YzhjNTM5OGIyNjBhNDcyOTQ%2F20260409%2Fcn-beijing%2Ftos%2Frequest&X-Tos-Date=20260409T062732Z&X-Tos-Expires=86400&X-Tos-Signature=8387f70531f2426287e2cf19eea1db225441aacbd27ca43133d55c19da804de7&X-Tos-SignedHeaders=host",
"size": "2048x2048"
}
],
"finish_reason": "stop",
"usage": {
"image_count": 1,
"input_tokens": null,
"output_tokens": 16384,
"total_tokens": 16384
},
"provider_request_id": ""
}
}
2.响应多张图

{
"code": 0,
"message": "success",
"trace_id": "6f016d94-b3e1-4a39-bed0-ce1f2ecd9dc5",
"data": {
"image": "https://ark-acg-cn-beijing.tos-cn-beijing.volces.com/doubao-seedream-5-0/021775717005703746a7620dda4a28d54e5c02b79b9456a84af80_0.png?X-Tos-Algorithm=TOS4-HMAC-SHA256&X-Tos-Credential=AKLTYWJkZTExNjA1ZDUyNDc3YzhjNTM5OGIyNjBhNDcyOTQ%2F20260409%2Fcn-beijing%2Ftos%2Frequest&X-Tos-Date=20260409T064431Z&X-Tos-Expires=86400&X-Tos-Signature=e32e72b0f77323c8e644bb302145cb341253cf40918769000579f681ce27d9e0&X-Tos-SignedHeaders=host",
"images": [
{
"url": "https://ark-acg-cn-beijing.tos-cn-beijing.volces.com/doubao-seedream-5-0/021775717005703746a7620dda4a28d54e5c02b79b9456a84af80_0.png?X-Tos-Algorithm=TOS4-HMAC-SHA256&X-Tos-Credential=AKLTYWJkZTExNjA1ZDUyNDc3YzhjNTM5OGIyNjBhNDcyOTQ%2F20260409%2Fcn-beijing%2Ftos%2Frequest&X-Tos-Date=20260409T064431Z&X-Tos-Expires=86400&X-Tos-Signature=e32e72b0f77323c8e644bb302145cb341253cf40918769000579f681ce27d9e0&X-Tos-SignedHeaders=host",
"size": "2048x2048"
},
{
"url": "https://ark-acg-cn-beijing.tos-cn-beijing.volces.com/doubao-seedream-5-0/021775717005703746a7620dda4a28d54e5c02b79b9456a84af80_1.png?X-Tos-Algorithm=TOS4-HMAC-SHA256&X-Tos-Credential=AKLTYWJkZTExNjA1ZDUyNDc3YzhjNTM5OGIyNjBhNDcyOTQ%2F20260409%2Fcn-beijing%2Ftos%2Frequest&X-Tos-Date=20260409T064438Z&X-Tos-Expires=86400&X-Tos-Signature=b66c4225f03807ca7f587a77e10f6740d98345a4f2b2a7b904c0dad081f65dd5&X-Tos-SignedHeaders=host",
"size": "2048x2048"
},
{
"url": "https://ark-acg-cn-beijing.tos-cn-beijing.volces.com/doubao-seedream-5-0/021775717005703746a7620dda4a28d54e5c02b79b9456a84af80_2.png?X-Tos-Algorithm=TOS4-HMAC-SHA256&X-Tos-Credential=AKLTYWJkZTExNjA1ZDUyNDc3YzhjNTM5OGIyNjBhNDcyOTQ%2F20260409%2Fcn-beijing%2Ftos%2Frequest&X-Tos-Date=20260409T064444Z&X-Tos-Expires=86400&X-Tos-Signature=4e2d25c74a7fc6d5ae74f22975201fab041619e51f98ab2c2e8b84d54f421147&X-Tos-SignedHeaders=host",
"size": "2048x2048"
},
{
"url": "https://ark-acg-cn-beijing.tos-cn-beijing.volces.com/doubao-seedream-5-0/021775717005703746a7620dda4a28d54e5c02b79b9456a84af80_3.png?X-Tos-Algorithm=TOS4-HMAC-SHA256&X-Tos-Credential=AKLTYWJkZTExNjA1ZDUyNDc3YzhjNTM5OGIyNjBhNDcyOTQ%2F20260409%2Fcn-beijing%2Ftos%2Frequest&X-Tos-Date=20260409T064449Z&X-Tos-Expires=86400&X-Tos-Signature=1bc94bbeb7725fac8488fb49e8b7c7846467482bf9b772a23fd3797450b4e0df&X-Tos-SignedHeaders=host",
"size": "2048x2048"
}
],
"finish_reason": "stop",
"usage": {
"image_count": 4,
"input_tokens": null,
"output_tokens": 65536,
"total_tokens": 65536
},
"provider_request_id": ""
}
}
错误响应
code说明

http状态码	code	说明
200	1001	请求参数错误，请检查url和body参数是否符合要求
200	1002	没有权限
200	1003	触发限流，提交任务过于频繁，超出限流阈值
200	1004	输入/输出内容审核不通过
200	3001	接口响应异常
500	5001	未知错误
500	5002	系统错误
错误响应示例

1.触发限流

{
"code": 1003,
"message": "Rate limit exceeded for model Doubao-Seedream-4.5",
"trace_id": "893fc939-26e4-4494-9772-282a414260b2",
"data": {
"rate_limit": {
"allowed": false,
"app_id": "2026899407",
"category": "image",
"total_limit": 300,       # 总的任务提交次数限制
"total_used": 11,         # 已提交的任务次数
"total_remaining": 289,   # 剩余可提交的任务次数
"daily_limit": 10,        # 今日可提交的任务次数
"daily_used": 10,         # 今日已提交的任务次数
"daily_remaining": 0      # 今日剩余可提交的任务次数
}
}
}
2.权限缺失

出现这个问题请在用户群联系小助手

{
"code": 1002,
"message": "app_id not have model permission",
"trace_id": "5bebe957-4c05-410b-abff-c30ddd0d4c2f",
"data": null,
}
使用须知
1、生成图片耗时

一般情况下生成一张图片需要10-30秒左右，图片越高清生成耗时则越高，如果生成多张图片，则生成耗时可能增加翻几倍，接口请求超时时间建议最少设置为60秒。

通用OCR

更新时间：2026-03-13 08:58:51

服务简介
识别用户向服务请求的某张图中的所有文字，并返回文字在图片中的位置信息，方便用户进行文字排版的二次处理参考。

接口说明
访问地址：http://api-ai.vivo.com.cn/ocr/general_recognition

访问方式：POST

请求参数
Header
参数	类型	是否必须	值
Content-Type	string	是	application/x-www-form-urlencoded
Authorization	String	是	Bearer AppKey
查询参数
参数	类型	是否必须	值
requestId	uuid	是	uuid值
Body
参数名称	类型	是否必须	说明
image	string	是	图像数据，base64编码（目前只支持识别jpg、png、bmp格式的图片）
pos	string/int	是	可取值为0、1、2。0代表只需要文字信息；1代表提供文字信息和坐标信息（坐标绝对值）；2代表将0和1的信息同时提供（坐标为相对值），建议取pos=2
businessid	string	是	“aigc”+appid
sessid	string	否	使用uuid，前端传递
businessid补充说明：

1990173156ceb8a09eee80c293135279，支持旋转图像、非正向文字识别

8bf312e702043779ad0f2760b37a0806，只支持正向文字识别，耗时比1990小

响应结果
参数	类型	说明
error_code	int	0: 成功，1: ocr识别失败，2: 图像错误
error_msg	string	succ：成功，ocr fail：识别失败，no parameter image：未上传图片
result	json	请求参数pos为0结果提供文字信息，pos为1结果提供文字信息和坐标信息（绝对值），pos为2结果提供0和1的信息（坐标为相对值）
version	string	ocr_VUG_v2.1.0_20200715
support	string	VIVO识图提供技术支持
result示例

请求参数pos为0

# angle可选的值为0/90/180/270
{
"result": {
"words": [
{"words": "取消"},
{"words": "编辑"}
],
"angle": 0
}
}
请求参数pos为1

# angle可选的值为0/90/180/270，top_left：左上，top_right：右上，down_left：左下，down_right：右下，x、y：像素百分比
{
"result": {
"OCR": [
{
"words": "取消",
"location": {
"top_left": {"x": 658.0, "y": 1130.0},
"top_right": {"x": 893.0, "y": 1130.0},
"down_left": {"x": 658.0, "y": 1174.0},
"down_right": {"x": 893.0, "y": 1174.0}
}
},
{
"words": "编辑",
"location": {
"top_left": {"x": 398.0, "y": 825.0},
"top_right": {"x": 1912.0, "y": 825.0},
"down_left": {"x": 398.0, "y": 1004.0},
"down_right": {"x": 1912.0, "y": 1004.0}
}
}
],
"angle": 0
}
}
调用示例
python示例

备注：鉴权文档鉴权方式-AppKey获取

#!/usr/bin/env python
# encoding: utf-8

import requests
import base64
import uuid

# 请注意替换AppId、AppKey、PIC_FILE
AppId = 'your_AppId'
AppKey = "your_AppKey"
DOMAIN = 'api-ai.vivo.com.cn'
URI = '/ocr/general_recognition'
METHOD = 'POST'
PIC_FILE = './test.jpg'


def ocr_test():
picture = PIC_FILE
with open(picture, "rb") as f:
b_image = f.read()
image = base64.b64encode(b_image).decode("utf-8")
post_data = {"image": image, "pos": 2, "businessid": "aigc"+AppId}
params = {
"requestId": str(uuid.uuid4())
}
print(params['requestId'])
headers = {
"Authorization": f"Bearer {AppKey}",
"Content-type": "application/x-www-form-urlencoded",
}
url = 'http://{}{}'.format(DOMAIN, URI)
response = requests.post(url, data=post_data, headers=headers,params=params, timeout=3)
if response.status_code == 200:
print(response.json())
else:
print(response.status_code, response.text)


if __name__ == '__main__':
ocr_test()

文本翻译

更新时间：2026-03-13 09:23:46

能力简介
将一段源语言文本转换成目标语言文本，可根据语言参数的不同实现多国语言之间的互译。

接口说明
访问地址：https://api-ai.vivo.com.cn/translation/query/self

访问方式：POST

请求参数
Header
参数	类型	是否必须	值
Content-Type	string	是	application/json
Authorization	String	是	Bearer AppKey
查询参数
参数	类型	是否必须	值
requestId	uuid	是	uuid值
Body
参数名称	类型	是否必须	示例值	描述
from	string	是	en	源语言，语言code见下方语言代码对照表
to	string	是	zh-CHS	目标语言，语言code见下方语言代码对照表
text	string	是	hello	需要翻译的句子，utf-8编码，长度限制1200
app	string	是	test	应用包名称，填写"test"
requestId	string	是	6bb798a1-3b5d-4f57-8a82-c480b56c14df	请求id，比如uuid
响应结果
Header
参数名称	参数值	描述
Content-Type	multipart/form-data
Body
参数名称	类型	是否必须	示例值	描述
code	number	否		
data	object	否		
+from	string	否		
+to	string	否		
+translation	string	否		翻译结果
+text	string	否		
msg	null	否		
requestId		否		
响应结果示例

{
"code": 0,
"data": {
"text": "我很好",
"from": "zh-CHS",
"to": "en",
"translation": "I'm fine"
},
"msg": "",
"requestId": "uuid"
}
调用示例
备注：鉴权文档鉴权方式-AppKey获取

# encoding: utf-8

import uuid
import requests

# 注意替换AppId、AppKey
AppId = 'your_AppId'
AppKey = "your_AppKey"
URI = '/translation/query/self'
DOMAIN = 'api-ai.vivo.com.cn'
METHOD = 'POST'

def text_translate():
text = "I'm fine"
data = {
'from': 'en',
'to': 'zh-CHS',
'text': text,
'app': 'test',
'requestId': str(uuid.uuid4())
}
params = {
"requestId": str(uuid.uuid4())
}
print(params['requestId'])
headers = {
"Authorization": f"Bearer {AppKey}",
"Content-type": "application/json",
}
print('headers', headers)
url = 'https://{}{}'.format(DOMAIN, URI)

    res = requests.post(url=url, headers=headers, data=data, params=params)

    if res.status_code == 200:
        print(res.json())
    else:
        print(res.status_code, res.text)


if __name__ == '__main__':
text_translate()
错误返回code

code	解释
10000	服务器异常
20000	参数错误
语言代码对照表
下表为各语言对应代码：

其中auto可以识别中文、英文、日文、韩文。

语言	代码
中文	zh-CHS
英文	en
日文	ja
韩文	ko

文本向量

更新时间：2026-04-15 04:54:55

服务简介
将用户提供的文本信息表示成计算机可识别的实数向量，用数值向量来表示文本的语义。

接口说明
访问地址：https://api-ai.vivo.com.cn/embedding-model-api/predict/batch

访问方式：POST

请求参数
Header

参数	类型	是否必须	值
Content-Type	string	是	application/json
Authorization	String	是	Bearer AppKey
查询参数
参数	类型	是否必须	值
requestId	uuid	是	uuid值
Body

参数名称	类型	是否必须	说明
model_name	string	是	文本向量化模型名称，当前支持：m3e-base、bge-base-zh-v1.5
sentences	array	是	需要向量化文本的JSON格式数组，示例：[“自动追焦相关报表”, “太古汇内云集逾180家知名品牌”]
model_name说明

model_name	说明
bge-base-zh-v1.5	近期开源很优秀的模型，擅长中文的召回场景，即较短的query召回较长的文本。query前面需要加上instruction：“为这个句子生成表示以用于检索相关文章：”。介绍见https://huggingface.co/BAAI/bge-base-zh-v1.5
m3e-base	近期开源很优秀的模型，擅长中文的文本比对场景，介绍见https://huggingface.co/moka-ai/m3e-base
我们重点优化了bge-base-zh-v1.5和m3e-base模型的推理性能，分别是我们调研的效果最好的中文模型和英文模型。

请求参数示例

# Content-Type设置为JSON格式，如"Content-Type: application/json"
{
"model_name": "m3e-base",
"sentences":["自动追焦相关报表","太古汇内云集逾180家知名品牌","其中逾70个品牌为第一次进驻广州","交通：商场M层连通地铁三号线石牌桥站；毗邻地铁一号线体育中心站。"]
}
如果是bge-base-zh模型，长文本的请求示例

# Content-Type设置为JSON格式，如"Content-Type: application/json"
{
"model_name": "bge-base-zh-v1.5",
"sentences":["自动追焦相关报表","太古汇内云集逾180家知名品牌","其中逾70个品牌为第一次进驻广州","交通：商场M层连通地铁三号线石牌桥站；毗邻地铁一号线体育中心站。"]
}
如果是bge-base-zh模型，短query的请求示例

# Content-Type设置为JSON格式，如"Content-Type: application/json"
{
"model_name": "bge-base-zh-v1.5",
"sentences":["为这个句子生成表示以用于检索相关文章：地铁交通","为这个句子生成表示以用于检索相关文章：太古汇"]
}
响应结果
参数	类型	说明
data	array	对应sentence的文本向量的实际值
返回响应示例

# data主体是向量的二维数组，向量维度与模型相关
{"data":[[-0.006009635981172323,0.0320364348590374,-0.012086838483810425,0.04545353353023529,....],[-0.04749463126063347,0.03422294184565544,0.011880395002663136,...]]
调用示例
备注：鉴权文档鉴权方式-AppKey获取

#!/usr/bin/env python
# encoding: utf-8

import requests
import uuid

# 注意替换AppId、AppKey
AppId = 'your_AppId'
AppKey = "your_AppKey"
DOMAIN = 'api-ai.vivo.com.cn'
URI = '/embedding-model-api/predict/batch'
METHOD = 'POST'


def embedding():
params = {}
post_data = {
"model_name": "m3e-base",
"sentences": ["豫章故郡，洪都新府", "星分翼轸，地接衡庐"]
}
params = {
"requestId": str(uuid.uuid4())
}
print(params['requestId'])
headers = {
"Authorization": f"Bearer {AppKey}",
"Content-type": "application/json",
}
print('headers', headers)
url = 'https://{}{}'.format(DOMAIN, URI)
response = requests.post(url, json=post_data, headers=headers,params=params )
if response.status_code == 200:
print(response.json())
else:
print(response.status_code, response.text)


if __name__ == '__main__':
embedding()
常见问题
1.Q：文本向量化能力支持的语种有哪些？

A：中文、英文，暂不支持其他语种向量化的功能。

2.Q: 文本长度是否有限制？

A：文本长度控制在500字以内。

服务简介
将用户提供的文本信息从语义的角度来判断两者相似度。

接口说明
请求地址：https://api-ai.vivo.com.cn/rerank

访问方式：POST

请求参数
Header

参数	是否必须	值
Content-Type	是	application/json
Authorization	String	是
查询参数

参数	类型	是否必须	值
requestId	uuid	是	uuid值
Body

参数名称	类型	是否必须	说明
model_name	string	是	文本向量化模型名称，当前支持：bge-reranker-large
query	string	是	示例：“科技发展趋势”
sentences	array	是	需要向量化文本的JSON格式数组，示例：[“自动追焦相关报表”, “太古汇内云集逾180家知名品牌”]
model_name说明

model_name	说明
bge-reranker-large	介绍见https://huggingface.co/BAAI/bge-reranker-large
我们重点优化了bge-reranker-large模型的推理性能。

请求参数示例

# Content-Type设置为JSON格式，如"Content-Type: application/json"
{
"model_name": "bge-reranker-large",
"query": "科技品牌发展",
"sentences":["自动追焦相关报表","太古汇内云集逾180家知名品牌","其中逾70个品牌为第一次进驻广州","交通：商场M层连通地铁三号线石牌桥站；毗邻地铁一号线体育中心站。"]
}
响应结果
参数	类型	说明
data	array	对应sentences中每条文本与query文本的相似度
返回响应示例

# data主体是数组，长度与输入的sentences数组相同，代表query与sentences中每条文本的相似度
{"data":[-8.067169189453125,-5.946075439453125,-4.977325439453125,-8.957794189453125]}
调用示例
备注：鉴权文档鉴权方式-AppKey获取

#!/usr/bin/env python
# encoding: utf-8

import requests
import uuid

# 注意替换AppId、AppKey
AppId = 'your_AppId'
AppKey = "your_AppKey"
DOMAIN = 'api-ai.vivo.com.cn'
URI = '/rerank'
METHOD = 'POST'


def rerank():
params = {}
post_data = {
"model_name": "bge-reranker-large",
"query": "老夫聊发少年狂",
"sentences": ["豫章故郡，洪都新府", "星分翼轸，地接衡庐"]
}
params = {
"requestId": str(uuid.uuid4())
}
print(params['requestId'])
headers = {
"Authorization": f"Bearer {AppKey}",
"Content-type": "application/json",
}
print('headers', headers)
url = 'https://{}{}'.format(DOMAIN, URI)
response = requests.post(url, json=post_data, headers=headers,params=params )
if response.status_code == 200:
print(response.json())
else:
print(response.status_code, response.text)


if __name__ == '__main__':
rerank()

常见问题
1.Q：文本相似度能力支持的语种有哪些？

A：中文、英文，暂不支持其他语种向量化的功能。

2.Q: 文本长度是否有限制？

A：文本 query + sentence 长度控制在500字以内。

询改写

更新时间：2026-03-13 09:25:25

服务简介
查询改写是RAG/AI搜索链路中的重要环节，目的是使用模型对用户当前输入的问题（query）进行理解，并改写为适合搜索引擎检索的query。改写后的结果可根据情况融入历史对话的关键信息，可对复杂问题进行拆解，使得检索召回的知识更加全面、丰富，为最终生成回答提供有力支持。

接口说明
外网请求地址：https://api-ai.vivo.com.cn/query_rewrite_base

请求方式：POST

请求参数
Header
参数名称	类型	是否必须	参数值
Content-Type	string	是	application/json
Authorization	String	是	Bearer AppKey
查询参数
参数	类型	是否必须	值
requestId	uuid	是	uuid值
Body
参数名称	类型	是否必须	说明
prompts	list	是	历史问答与当前问题组成的数组，目前支持传入最多3轮历史信息
prompts中参数说明

参数名称	类型	是否必须	说明
q3	string	是	上三轮问题，如没有则传空字符串
a3	string	是	上三轮回答，如没有则传空字符串
q2	string	是	上两轮问题，如没有则传空字符串
a2	string	是	上两轮回答，如没有则传空字符串
q1	string	是	上一轮问题，如没有则传空字符串
a1	string	是	上一轮回答，如没有则传空字符串
q	string	是	当前轮问题
Body示例

{
"prompts": [
[
"",
"",
"",
"",
"战狼2是谁主演的",
"《战狼2》是由吴京执导并主演的一部军事战争题材电影。影片中，吴京饰演了主角冷锋，他是一名退役的特种部队军人，在非洲执行任务时遭遇了一连串危机和战斗。因此，《战狼2》的主演是吴京。"
],
[
"第一部里有他吗"
]
]
}
示例说明

{
"prompts": [
[
"",  // q3, 上三轮问题
"",  // a3, 上三轮回答
"",  // q2, 上两轮问题
"",   // a2, 上两轮回答
"战狼2是谁主演的",  // q1, 上一轮问题
"《战狼2》是由吴京执导并主演的一部军事战争题材电影。影片中，吴京饰演了主角冷锋，他是一名退役的特种部队军人，在非洲执行任务时遭遇了一连串危机和战斗。因此，《战狼2》的主演是吴京。" // a1, 上一轮回答
],
[
"第一部里有他吗" // q，当前轮问题
]
]
}
响应结果
参数	类型	说明
code	int	0: 成功，其它表示失败，详细见下方错误码说明
result	list	改写后结果
结果示例

{'result': ['《战狼》第一部里有吴京吗'], 'code': 0}
错误码说明

错误码（code）	含义
0	正常
-2	请求列表格式错误
-3	当前query长度大于50
-4	当前query含有特定词语（A类）
-5	当前query含有特定词语（B类）
-6	上轮历史只有query或只有answer
-8	当前query含有特定模版不进行改写
-9	模型判定无需改写
-3002	服务运行异常
调用示例
备注：鉴权文档鉴权方式-AppKey获取

#!/usr/bin/env python
# encoding: utf-8

import json
import uuid

import requests

# 注意替换AppId、AppKey
AppId = 'your_AppId'
AppKey = "your_AppKey"
URI = '/query_rewrite_base'
DOMAIN = 'api-ai.vivo.com.cn'
METHOD = 'POST'


def query_rewrite():
params = {}
post_data = {
"prompts": [
[
"",
"",
"",
"",
"战狼2是谁主演的",
"《战狼2》是由吴京执导并主演的一部军事战争题材电影。影片中，吴京饰演了主角冷锋，他是一名退役的特种部队军人，在非洲执行任务时遭遇了一连串危机和战斗。因此，《战狼2》的主演是吴京。"
],
[
"第一部里有他吗"
]
]
}
data = json.dumps(post_data)
params = {
"requestId": str(uuid.uuid4())
}
print(params['requestId'])
headers = {
"Authorization": f"Bearer {AppKey}",
"Content-type": "application/json",
}
print('headers', headers)

    url = 'http://{}{}'.format(DOMAIN, URI)
    response = requests.post(url, data=data, headers=headers, params=params)
    if response.status_code == 200:
        print(response.json())
    else:
        print(response.status_code, response.text)

if __name__ == '__main__':
query_rewrite()

实时短语音识别

更新时间：2026-03-13 10:48:12

服务简介
本文主要描述基于websocket协议之上的实时ASR交互接口协议， 基于该接口协议，客户端可以选择合适的语言进行客户端的开发，短语音指单轮识别时长在60s之内。

接口说明
实时ASR服务是基于WebSocket协议实现数据的传输。 主要是包含两个阶段：握手阶段和实时通信阶段 。

注意
说明：支持的音频格式为16k/16b 单声道的PCM编码格式音频

API
WebSocket 握手阶段主要是用于客户端和服务端建立WebSocket通信通道

请求地址
域名：api-ai.vivo.com.cn

握手参数
Headers

参数	类型	是否必须	值
Authorization	string	是	Bearer AppKey
URL参数通过key1=val1&key2=val2…&keyn=valn 方式拼接 ， 并附加在url后面 ， 例如 ：

ws://api-ai.vivo.com.cn/asr/v2?key1=val1&key2=val2..&keyn=valn
字段	类型	说明	是否必选	是否要urlencode	备注
model	string	手机型号	否	是
system_version	string	手机系统版本号	否	是
client_version	string	应用版本号	是	是	可写默认值"unknown"
package	string	应用包名	是	是	可写默认值"unknown"
sdk_version	string	sdk版本号	是	是	可写默认值"unknown"
user_id	string	用户id(32位字符串，包括数字和小写字母)	是	是	唯一标志符
android_version	string	android版本号	是	是	可写默认值"unknown"
system_time	string	系统时间	是	是	Unix timestamp, 单位:毫秒
net_type	string	网络状态	是	是	0数据网络，1 wifi环境
engineid	string	能力id，如shortasrinput	是	是	短语音根据所需的模型类别选择能力id，一般选通用模型：shortasrinput
requestId	uuid	追踪链路	是		
发送语音请求
语音请求text参数
1） websocket连接建立成功之后，调用端首先向服务端发送一个opcode为text的报文
2） 这个报文的payload是一个json字符串

参数名	类型	说明	是否必选	备注
type	string	text包的类型	是	started
request_id	string	uuid，标识一次请求，32字符	是
asr_info.end_vad_time	int	后端检测时间	是	单位：毫秒
asr_info.audio_type	string	音频类型	是	pcm/opus
asr_info.chinese2digital	int	是否打开汉字转数字	是	0关闭，1打开
asr_info.punctuation	int	是否打开标点符号	是	0：无标点 1：带标点
business_info	string	扩展字段，可用于透传信息	否
语音请求binary数据
1） 调用端发送完opcode为text的报文之后，接着发送语音数据，opcode为binary, payload是语音数据
2） 语音数据建议分帧发送，每帧包含的语音时长是40毫秒，单句不超过60s
3） 语音数据发送完毕之后，再发送一个opcode为binary，payload是’ --end –- ‘，表示语音数据发送完毕
4） 需要关闭时，发送一个opcode为binary，payload是’ --close-- '，服务端收到后退出连接

接收数据格式
握手返回包
成功:

{
"action":"started",
"code":0,
"data":"",
"desc":"success",
"sid":"5e094340-31be-47e7-83ad-7c6f27cd4f74"
}
失败:

{
"action":"error",
"code":1001,
"data":"",
"desc":"time out",
"sid":"5e094340-31be-47e7-83ad-7c6f27cd4f74"
}
识别结果返回包:

{
"sid":"e831d141-34e0-4617-a1b9-4ba43811453c@91",
"is_finish":false,
"data":{
"result_id":91,
"reformation":1,
"is_last":true,
"text":"气场中的场的部首共是多少笔。"
},
"action":"result",
"request_id":"req_id",
"code":0,
"desc":"success",
"type":"asr"
}
返回字段
参数	类型	说明
action	string	返回类型(started-握手成功, result-结果, error-出错)
type	string	业务类型(asr-语音识别, nlu-语义理解，common-通用返回)
code	int	返回码， 成功为0， 详细见2.4
data	object	结果数据
desc	string	描述
sid	string	会话id
data字段说明

参数	类型	说明
text	string	asr识别结果
result_id	int	结果序列号
reformation	int	asr识别返回， 1代表修正 0代表追加
business_info	stirng	透传，由业务方和应用决定
is_last	bool	是否为本次会话最后一条结果
is_finish	bool	是否为本次连接最后一条结果
识别错误码
错误码	描述
10000	参数校验失败
10002	引擎服务异常
10003	获取中间识别结果失败
10004	获取最终识别结果失败
10005	解析引擎数据异常
10006	引擎内部错误
10007	请求nlu出错
10008	音频超长
调用示例
python调用demo：实时短语音识别demo

使用说明见：demo使用说明

地理编码(POI搜索)

更新时间：2026-03-13 09:31:38

服务简介
输入关键字，查询对应城市的POI接口，输出相关联的地理名称、类别、经度纬度、附近的酒店饭店商铺等信息。

接口说明
访问地址：https://api-ai.vivo.com.cn/search/geo

访问方式：GET

请求参数
Header

参数	类型	是否必须	值
Content-Type	string	是	application/json
Authorization	String	是	Bearer AppKey
查询参数

参数	类型	是否必填	描述	示例值
keywords	String	是	关键字	卓悦汇
city	String	是	行政区划编码或城市名称	深圳市或440300
page_num	int	否	当前页数	2 （小于1按1处理，大于20按20处理）
page_size	int	否	每页条目数	10 （小于1按10处理，大于15按15处理）
requestId	uuid	是	uuid值
响应结果
Header

参数	类型	值
Content-Type	string	application/json
Body

参数	类型	是否必填	最大长度	描述	示例值
statusCode	int	是		状态码
statusInfo	int	是		状态信息
total	string	是		poi总数
pois	array[poi(object)]	是		poi列表
currentDistrict	object	是		当前行政区域
poi的格式如下：

参数	类型	是否必填	最大长度	描述	示例值
name	string	是		名称	卓悦汇
address	string	是		地址	中康路126
province	string	是		省	广东省
city	string	是		市	深圳市
district	string	是		区	福田区
nid	string	是		id	44010000880698
phone	string	是		电话
location	string	是		经纬度坐标（02坐标）,经度和纬度用","分隔	114.060325,22.570432
distance	int	是		距离	0.0
currentDistrict的格式如下：

参数	类型	是否必填	描述	示例值
name	string	是	名称	深圳市
level	int	是	行政区域级别，0：国家、1：省、2：市、3：县	2
centerPoint	string	是	行政区域中心点（市级行政区的中心点是城区的中心点），经度和纬度用","分隔，备注：中心点数据可以人工配置	114.05369,22.54267
adcode	string	是	区域编码	440300
响应示例

{
"isNearby": 0,
"nearbyParam": null,
"filter": null,
"poiStyle": "normal",
"topicName": null,
"searchType": "normal",
"totalCount": 52,
"pois": [
{
"mid": "93377815",
"province": "广东省",
"district": "福田区",
"tag": "",
"brand": "",
"alias": null,
"confidenceLevel": "1",
"direct": "",
"hit": 119,
"point": 1,
"cityPoint": 1,
"url": "",
"photo": "",
"border": null,
"road": null,
"score": 1.0,
"parentId": "",
"standbyTypeName": "",
"standbyTypeCode": "",
"standbyTag": "",
"standbyBrand": "",
"chaincode": "",
"extds": null,
"city": "深圳市",
"nid": "44010000880698",
"cpid": "",
"src": "www.navinfo.com",
"phone": "0755-82566588",
"typeName": "百货商场零售",
"typeCode": "130102,650100,650000",
"location": "114.060325,22.570432",
"side": "",
"rank": "0",
"adcode": "440304",
"name": "卓悦汇",
"address": "中康路126",
"naviLocation": "114.060325,22.570562",
"distance": 0.0
},
{
"mid": "500047755",
"province": "广东省",
"district": "盐田区",
"tag": "",
"brand": "",
"alias": null,
"confidenceLevel": "1",
"direct": "",
"hit": 1,
"point": 1,
"cityPoint": 1,
"url": "",
"photo": "",
"border": null,
"road": null,
"score": 1.0,
"parentId": "",
"standbyTypeName": "",
"standbyTypeCode": "",
"standbyTag": "",
"standbyBrand": "",
"chaincode": "",
"extds": null,
"city": "深圳市",
"nid": "44010000233953",
"cpid": "",
"src": "www.navinfo.com",
"phone": "18876146807",
"typeName": "服装、箱包零售",
"typeCode": "130301,650300,650000",
"location": "114.232137,22.551464",
"side": "",
"rank": "0",
"adcode": "440308",
"name": "卓悦汇",
"address": "官下路79",
"naviLocation": "114.232247,22.551554",
"distance": 0.0
}
],
"currentDistrict": {
"level": 2,
"centerPoint": "114.05369,22.54267",
"citycode": "020_10",
"name": "深圳市",
"adcode": "440300"
},
"total": 52,
"statusCode": 4,
"statusInfo": "cookie is null",
"dataType": 30
}
调用示例
备注：鉴权文档鉴权方式-AppKey获取

#!/usr/bin/env python
# encoding: utf-8
import uuid
import requests

# 注意替换AppId、AppKey
AppId = 'your_AppId'
AppKey = "your_AppKey"
DOMAIN = 'api-ai.vivo.com.cn'
URI = '/search/geo'
METHOD = 'GET'


def geocode_poi():
""" 地理编码（poi搜索） """
params = {
'keywords': '卓悦汇',
'city': '深圳',
'page_num': 1,
'page_size': 3,
"requestId": str(uuid.uuid4())
}
print(params['requestId'])
headers = {
"Authorization": f"Bearer {AppKey}",
"Content-type": "application/json",
}
print('headers', headers)
url = 'http://{}{}'.format(DOMAIN, URI)
response = requests.get(url, params=params, headers=headers)

    if response.status_code == 200:
        data = response.json()
    else:
        data = response.text
    print(data)


if __name__ == "__main__":
geocode_poi()
常见问题
Q：地理编码的只能转成高德坐标系吗？是否支持转成百度？

A：不支持，如果需要自己进行转换，请参考：https://github.com/wandergis/coordTransform_py

端侧3B模型

更新时间：2026-05-25 04:33:43

能力介绍
提供3B蓝心大模型BlueLM的移动端推理能力

SDK和模型下载
SDK以C++ so库和头文件的形式提供，涉及在android端native开发
端侧LLM 推理SDK

在复赛阶段提供[BlueLM开源3B],
云真机 （X300 Pro）机器 在/sdcard/1225/路径下默认内置模型
注意：禁止修改模型文件夹内各个文件的名字， 否则将无法读取模型，造成错误

接入和调用流程
建议使用Android Studio 进行开发，可以通过界面新建一个native工程 或者 建议直接基于demo源码进行二次开发
image1.png
若自建新的工程需要进行如下操作：
1.添加aar文件
将 llm-sdk-release.aar复制到项目的 app/libs/ 目录下。
在 app/build.gradle 中添加依赖：

android {
defaultConfig {
minSdk 28
ndk { abiFilters 'arm64-v8a' }  // 仅支持 arm64
}
}
dependencies {
implementation files('libs/llm-sdk-release.aar')
implementation 'androidx.appcompat:appcompat:1.6.1'
}
2.在AndroidManifest.xml中添加权限

<!-- 存储权限：读取 /sdcard/ 下的模型文件 -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
android:maxSdkVersion="32"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
android:maxSdkVersion="32"/>
<uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE"/>
<uses-permission android:name="mediatek.permission.ACCESS_APU_SYS"/>
...
<uses-native-library android:name="libdmabufheap.so" android:required="false" />
<uses-native-library android:name="libvcap_npu_network_v1.so" android:required="false" />
Snipaste_20240528_145619.jpg

即可使用SDK进行开发,也可以参考我们提供的demo源码

接口介绍
文本审核
为了避免暴力、涉黄、涉政、辱骂等非法文本的生成，我们要求参赛选手在使用端侧大语言模型推理时，接入系统文本审核能力。
具体使用方式参考文档

LLM推理
LLM 推理能力通过 Java 封装类 LlmManager 提供，底层对接 LLM_inference_manager 原生库。

LlmConfig 初始化参数
参数	类型	默认值	描述
modelPath	String	—	必填，模型目录路径，云真机内置路径为 /sdcard/1225
nCtx	int	2048	上下文长度(支持2048 4096 8192)
nThreads	int	4	CPU 线程数
npuPower	int	100	NPU 档位，MTK 取值 10~100，越高性能越好
temperature	float	0.0	越大输出越随机，0 为贪心解码
topP	float	1.0	累计概率阈值，超出后不再考虑剩余 token
topK	int	1	单步最多考虑的 token 数量
LlmManager 接口
init(LlmConfig config) → int
初始化模型，返回 0 表示成功，非 0 为错误码。耗时操作，需在子线程调用。

generate(String prompt, TokenCallback callback)
执行推理，流式回调每个 token。prompt 需套用 chat 模板：

[|Human|]:用户输入\n[|AI|]:
推理在内部子线程执行，回调方法在主线程被调用，可直接更新 UI。

interrupt()
中断当前正在进行的推理。

release()
释放原生资源，Activity 销毁时必须调用。

TokenCallback 回调接口
public interface TokenCallback {
void onToken(String token);                    // 每生成一个 token 回调一次
void onComplete(LlmStats stats);               // 推理正常结束
void onError(int code, String message);        // 推理失败
}
调用示例
C++调用示例
// 初始化
llm_params params;
params.model_path      = const_cast<char*>(modelPath.c_str());
params.context_suffix  = "";         // 留空，SDK 自动从 config JSON 选择
params.vocab_json_path = nullptr;
params.merges_path     = nullptr;
params.runtime         = DX3_APU;
params.model_type      = BlueLM_3B;
params.tokenizer_type  = 1;         // 1 = bluelm tokenizer
params.n_predict       = 512;      // 最大生成 token 数
params.n_ctx           = 2048;
params.n_threads       = 4;
params.npu_power       = 100;

      llm_instance_ = new LLM_inference_manager();
      llm_trace trace;
      LLM_CODE res = llm_instance_->init_base(params, trace);
      if (res != LLM_SUCCESS) {
          delete llm_instance_;
          llm_instance_ = nullptr;
          return res;
      }
        ...
      // 推理（prompt 需套用 chat 模板）
      std::string prompt = "[|Human|]:" + userInput + "\n[|AI|]:";
      res = llm_instance_->forward(prompt, true, eval_cb, handle);
      if (res != LLM_SUCCESS && res != LLM_INTERRUPTED) {
          return res;
      }
      // 每次推理结束后必须 reset
      llm_instance_->llm_reset();
        ...
      // 释放
      llm_instance_->release();
      delete llm_instance_;
      llm_instance_ = nullptr;
JAVA调用示例
// 1. 初始化（在子线程中调用，init_base 耗时较长）
LlmManager llmManager = new LlmManager();

      LlmConfig config = new LlmConfig();
      config.modelPath    = "/sdcard/1225"; // 模型目录
      config.nPredict     = 512;
      config.nCtx         = 2048;
      config.nThreads     = 4;
      config.npuPower     = 100;
      config.temperature  = 0.95f;
      config.topP         = 0.8f;
      config.topK         = 50;

      new Thread(() -> {
          int ret = llmManager.init(config);
          runOnUiThread(() -> {
              if (ret == 0) {
                  // 初始化成功，可以开始推理
              } else {
                  // 初始化失败，错误码 ret
              }
          });
      }).start();

      // 2. 推理（在子线程中执行，通过回调流式返回结果）
      // prompt 必须套用 chat 模板，否则输出乱码
      String prompt = "[|Human|]:" + userInput + "\n[|AI|]:";

      llmManager.generate(prompt, new TokenCallback() {
          @Override
          public void onToken(String token) {
              // 每个 token 回调一次，在主线程更新 UI
              tvResponse.append(token);
          }

          @Override
          public void onComplete(LlmStats stats) {
              // 推理完成，stats 包含 TPS 等性能指标
          }

          @Override
          public void onError(int code, String message) {
              // 推理失败
          }
      });

      // 3. 中断推理（可选）
      llmManager.interrupt();

      // 4. 释放资源（Activity 销毁时调用）
      llmManager.release();
示例 Demo
已编译的APK demo
APK demo

云真机已内置了端侧模型, 若使用云真机 运行apk，
可以使用adb connect 远程连接对应机器ip, 再执行 adb install即可开始体验。

screen.png
MainActivity：LLM 推理能力调用，界面布局从上到下：

模型路径输入框（etModelPath）：填写模型文件所在目录，默认 /sdcard/1225
"初始化"按钮（btnInit）：点击后在后台线程调用 LlmManager.init()，成功后按钮变为"已初始化"且置灰，输入框和发送按钮解锁
响应展示区（tvResponse，带 ScrollView）：流式显示模型逐 token 输出，自动滚动到底部
Prompt 输入框（etInput）：输入用户消息（无需手动添加模板，发送时自动包装为 [|Human|]:...\n[|AI|]:）
"发送"按钮（btnSend）：触发推理，推理期间置灰防止重复提交
"中断"按钮（btnInterrupt）：推理中可见，点击后调用 LlmManager.interrupt() 停止当前推理
注意：首次启动需授予「所有文件访问权限」（Android 13+），App 启动时会自动跳转权限设置页。

源代码
端侧LLM源代码

已验证开发环境
条件	要求
Android 目标平台	arm64-v8a
芯片	MediaTek DX5（MT6993 等）
Android SDK	API 28+
NDK	r23（交叉编译 llm_utils 时使用）
CMake	3.22.1+（Android Studio 自带）
Gradle	8.5
AGP	8.2.2
安装完Android Studio后，可以将adb所在路径添加至系统Path，方便后续用adb命令行执行操作

常见问题
demo APK安装失败，闪退
APK运行依赖系统版本，需运行在比赛特定机型上面，并保证指定模型路径下存在完整的模型文件

Android 权限
Android 13+ 读取 /sdcard/ 需要 MANAGE_EXTERNAL_STORAGE，READ_EXTERNAL_STORAGE 带 maxSdkVersion=32 在 Android 13 上无效。
AndroidManifest.xml：

<uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" />
运行时申请（MainActivity）：

if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
if (!Environment.isExternalStorageManager()) {
Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION,
Uri.parse("package:" + getPackageName()));
startActivity(intent);
}
}

端侧文本审核

更新时间：2024-05-28 05:53:45

服务简介
提供端侧文本审核服务，智能检测文本内容是否命中包括暴力、涉黄、涉政、辱骂等敏感内容，命中则审核不通过

接入准备
SDK下载
AIGC文本审核aar

Android Studio接入
添加SDK依赖包：在工程项目下找到文件夹libs，如果没有请新建，将下载的aar包放入
添加依赖：打开应用级"build.gradle"文件，在"dependencies"中添加依赖
dependencies {
implementation files('libs/aisdk-cms-local-1.0.0.0.aar')
}
混淆配置: 编译APK前需配置混淆配置文件，避免混淆导致功能异常
在应用级根目录下打开混淆配置文件，如 proguard-rules.pro。添加如下配置
-keep class com.vivo.aisdk.**{*;}
-dontwarn com.vivo.aisdk.**
-keep class com.vivo.aiservice.cms.**{*;}
应用开发指南
SDK初始化
应用开发之前，必须先完成SDK初始化流程，完成公共参数的设置和相关初始化设置

接口函数
/**
* 初始化sdk
* @param context     context上下文对象
* @param listener    初始化回调结果
  */
  public void init(final Context context, final IInitializeListener listener)
  输入输出
  参数明细	类型	描述
  context	Context	上下文对象
  listener	IInitializeListener	初始化结果回调
  调用示例
  import com.vivo.aisdk.cms.local.CmsLocalFrame; // CMS服务总类
  import com.vivo.aisdk.cms.local.IInitializeListener; // 初始化回调
  import com.vivo.aisdk.cms.local.utils.LogUtils;  // sdk内部日志工具类

// 在Application中初始化CMS本地化框架
@Override
public void onCreate() {
super.onCreate();
// 初始化CMS本地化框架，建议在Application中初始化
CmsLocalFrame.getInstance().init(this, new IInitializeListener() {
@Override
public void onInitSuccess() {
LogUtils.i("sdk 初始化成功!");
}
@Override
public void onInitFailed(int code, String message) {
LogUtils.e("sdk 初始化失败 code = " + code + ", message = " + message);
}
});
}
初始化异常code
code	描述
110010	初始化参数，缺少context
文本审核功能
初始化SDK完成之后即可开始具体功能-文本审核的开发工作

接口函数
/**
* 文本审核
*
* @param text    待审核文本
* @param timeout 超时时间
* @return ResponseResult  结果
  */
  public void TextModeration(String text, CommApiCallBack<ResponseResult> callBack, int timeout)
  输入输出
  参数明细	类型	描述
  text	String	待审核文本
  callback	CommApiCallBack	callback 结果回调
  timeout	long	超时时间（ms）
  ResponseResult 数据结构：

参数明细	类型	描述
code	int	0:成功；其他: 异常，详见错误码说明
msg	String	错误信息
data	String	结果数据内容，json 字符串
respId	String	id
ver	String	协议版本
api	int	sdk接口
type	String	service 能力接口类型
extras	String	extral
ResponseResult.getData 数据结构:

参数明细	类型	描述
result	String	0:审核通过， 1：嫌疑， 2：审核不通过
结果示例

{"result":"0"}
调用示例
1.导入必须类：在使用文本审核API时，将相关的类添加至工程

import com.vivo.aisdk.cms.local.CmsLocalFrame;   // CMS服务总类
import com.vivo.aisdk.cms.local.internal.CommApiCallBack; // 结果回调
import com.vivo.aisdk.cms.local.internal.ResponseResult;  // 接口返回的结果类
import com.vivo.aisdk.cms.local.utils.LogUtils;   // log工具类

2. 应用CmsLocalFrame进行接口调用， 异步获取审核结果
   String text = "待测试文本内容";
   long  timeout = 5000;

CmsLocalFrame.getInstance().TextModeration(text, new CommApiCallBack<ResponseResult>() {
@Override
public void onCallBack(ResponseResult responseResult) {
if (responseResult.getCode() == CMSLocalConstants.ResultCode.SUCCESS) {
//调用成功：解析结果
String data = responseResult.getData();
try {
JSONObject json = new JSONObject(data);
// 系统默认方法将 String转换为int 类型。
int result = json.getInt("result");
if (result == 0) {
// 审核通过
LogUtils.d("checked");
} else if (result == 1) {
// 存在嫌疑
LogUtils.d("Under suspicion");
} else if (result == 2) {
// 未通过审核
LogUtils.d("not checked");
}
} catch (JSONException e) {
LogUtils.e("json error: " + e.getMessage());
}
} else {
//返回错误码
showMesage(responseResult.getMsg());
}
}
},  timeout);
结果示例
测试文案	结果
如果您想管理自己的数字货币，可以到数字人民币的官方服务平台，注册开通个人钱包，这样可以帮助您保护好自己的现金，不必担心跟踪失败或遗失问题，并有效地进行数字货币交易和转账。	2：审核不通过
今天天气真不错	0：审核通过
错误码
code	错误描述
0	success：成功
110001	未知错误
110002	参数错误
110003	远程服务不存在
110004	远程服务未连接
110005	能力不支持
110006	请求超时
110007	返回结果为空
110008	鉴权失败
110009	远程服务错误
110010	初始化参数，缺少context
文本审核Demo体验
Demo简介：

Application入口: DemoApplication，sdk初始化
MainActivity：文本审核功能实现。

文本输入框：输入审核文本

"Submit"按钮：调用输入文本进行文本审核

结果展示: 展示审核结果

Demo apk

Demo 源码

常见问题
文本审核失败，toast提示错误信息 “unexception error, result is null”
请确保审核能力在调用前已成功初始化，需要进一步分析可以抓取“_V_AiSdk”相关的LOG，并联系vivo的开发人员

