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