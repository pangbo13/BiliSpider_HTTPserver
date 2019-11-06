# coding:utf-8

########
# 参考：https://www.cnblogs.com/xinyangsdut/p/9099623.html
########

import socket
import re
import psutil
import json
import os
import time

from threading import Thread
from queue import Queue


# 设置静态文件根目录
HTML_ROOT_DIR = "./html"
os.chdir(os.path.dirname(__file__))

class HTTPServer(object):
    def __init__(self):
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server_socket.setsockopt(
            socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.tcp_spider_connection = 0
        self.spider_status = {}
        self.exit_mes = False
        self.content_type ={
            "css":r"text/css",
            "html":r"text/html",
            "htm":r"text/html",
            "js":r"application/x-javascript",
            "ico":r"image/x-icon",
            "png":r"image/png",
            "jpg":r"image/jpeg"
        }

    def start(self):
        self.server_socket.listen(128)
        while not self.exit_mes:
            client_socket, client_address = self.server_socket.accept()
            print("[%s, %s]用户连接上了" % client_address)
            handle_client_process = Thread(
                target=self.handle_client, args=(client_socket,client_address))
            handle_client_process.start()
            #client_socket.close()
            #print(self.spider_status)

    def handle_client(self, client_socket,client_address):
        """
        处理客户端请求
        """
        # 获取客户端请求数据
        request_data = client_socket.recv(1024).decode()
        request_lines = request_data.splitlines()
        if len(request_lines) > 0:
            # 解析请求报文
            request_start_line = request_lines[0]
        else:
            client_socket.close()
            return
        
        if "HTTP" in request_start_line:
            self.handle_http(request_lines,request_start_line,client_socket,client_address)
        elif "BilispiderSocket" in request_start_line:
            self.handle_spidersocket(request_lines,request_start_line,client_socket,client_address)
        else:
            client_socket.send(b"NON_SUPPORT")
            client_socket.close()

        #print("response data:\n", response)

    def handle_spidersocket(self,request_lines,request_start_line,client_socket,client_address):
        self.spidersocket = BilispiderSocket(client_socket,client_address)
        self.tcp_spider_connection += 1
        self.spidersocket.receive()
        self.tcp_spider_connection -= 1
        # try:
        #     while True:
        #         msg = client_socket.recv(1024)
        #         client_socket.send(msg)
        # except ConnectionResetError:
        #     print("连接中断")

    def handle_http(self,request_lines,request_start_line,client_socket,client_address):
        # 设置响应头
        response_headers = "Server: BiliSpider server\r\n"\
        "Access-Control-Allow-Origin:*\r\n"\
        "Access-Control-Allow-Method:POST,GET\r\n"
        
        # 提取用户请求的文件名
        file_name = re.match(
            r"\w+ +(/[^ ]*) ", request_start_line).group(1)

        if "/" == file_name:
            file_name = "/index.html"

        if len(file_name) >= 5 and file_name[:5] == '/data':
            response_start_line = "HTTP/1.1 200 OK\r\n"
            response_headers += "Content-Type: application/json\r\n"
            response_body = json.dumps({'sys': self.get_sysinfo(),
                                        'spider': self.get_status(),
                                        },indent=4)
        elif len(file_name) >= 5 and file_name[:5] == '/post':
            self.set_status(json.loads(request_lines[-1]))
            response_body = 'received!'

            response_start_line = "HTTP/1.1 200 OK\r\n"
        elif len(file_name) >= 5 and file_name[:5] == '/exit':
            response_body = 'received exit command!'
            self.exit_mes = True
            from time import sleep
            response_start_line = "HTTP/1.1 200 OK\r\n"
            #response_headers = "Server: BiliSpider server\r\n"
        else:
            # 打开文件，读取内容
            try:
                file = open(HTML_ROOT_DIR + file_name, "rb")
            except IOError:
                response_start_line = "HTTP/1.1 404 Not Found\r\n"
                #response_headers = "Server: BiliSpider server\r\n"
                response_body = "The file is not found!"
            else:
                file_data = file.read()
                file.close()
                # 构造响应数据
                response_headers += "Content-Type: " + self.content_type.get(file_name.rsplit('.',1)[1],r"application/octet-stream") + "\r\n"
                response_start_line = "HTTP/1.1 200 OK\r\n"
                #response_headers = "Server: BiliSpider server\r\n"
                response_body = file_data

        if isinstance(response_body,bytes):
            pass
        elif isinstance(response_body,str):
            response_body = response_body.encode('utf-8')
        else:
            response_body = str(response_body).encode('utf-8')

        response = bytes(response_start_line + response_headers + "\r\n" , 'utf-8')+ response_body
        
        # 向客户端返回响应数据
        client_socket.send(response)

        # 关闭客户端连接
        client_socket.close()

    def get_status(self):
        if self.tcp_spider_connection:
            msg_id = self.spidersocket.send("get_status",True)
            try:
                return(json.loads(self.spidersocket.get_response(msg_id)))
            except:
                print("tcp通讯失败")
                return self.spider_status
        else:
            return self.spider_status


    def bind(self, port):
        self.server_socket.bind(("", port))

    @classmethod
    def get_sysinfo(self):
        # 获取内存信息
        mem_keys = ('total', 'available', 'percent', 'used', 'free')
        mem_svmem = psutil.virtual_memory()
        mem_info = {}
        for i in range(len(mem_keys)):
            mem_info[mem_keys[i]] = mem_svmem[i]
        # 获取CPU使用率
        cpu_info = {'usage': psutil.cpu_percent(percpu=True)}
        # 获取网络IO
        net_keys = ('bytes_sent', 'bytes_recv', 'packets_sent',
                    'packets_recv', 'errin', 'errout', 'dropin', 'dropout')
        net_snetio = psutil.net_io_counters()
        net_info = {}
        for i in range(len(net_keys)):
            net_info[net_keys[i]] = net_snetio[i]

        sys_info = {'mem': mem_info, 'cpu': cpu_info, 'net': net_info}

        return sys_info
    
    def set_status(self,status):
        self.spider_status.update(status)

class BilispiderSocket(object):
    def __init__(self,client_socket,client_address):
        self.client_socket = client_socket
        self.client_address = client_address
        self.message = {}
        self.message_id = set()
        print("hello")
        self.send("hello")
        print("hello")
    def receive(self):
        while True:
            try:
                data = self.client_socket.recv(1024).decode()
            except ConnectionResetError:
                print("与{}连接中断".format(self.client_address[0]))
                return
            request_start_line,request_content = data.split("\n",1)
            if "BilispiderSocket" not in request_start_line:
                self.send("not support")
            else:
                msg_id = int(request_start_line.split("/")[-1])
                if msg_id in self.message:
                    self.message[msg_id].put(request_content)
                Thread(target=self.handle_msg,args=(request_content,msg_id)).start()
                #msg_id = self.send(request_content,response=True)
                # content = self.get_response(msg_id)
                # self.send(msg_id+content)
    def send(self,msg,response = 0):
        if response:
            msg_id = int(time.time()*10000)%10000000000
            self.message_id.add(msg_id)
            self.message[msg_id] = Queue(1)
        else:
            msg_id = 0
        data = "BilispiderSocket /{} \n{}".format(msg_id,msg).encode()
        Thread(target=self.client_socket.send,args=(data,),name="socketsender").start()
        return msg_id
    def get_response(self,msg_id):
        if msg_id in self.message_id:
            self.message_id.remove(msg_id)
        else:
            return ""
        # while True:
        #     if msg_id in self.message:
        #         return self.message.pop(msg_id)
        #     else:
        #         time.sleep(0.1)
        msg = self.message[msg_id].get(timeout=2)
        del self.message[msg_id]
        return msg
    def handle_msg(self,content,msg_id):
        if not msg_id:
            print(content)
            msg_id = self.send(content,response=True)
            print(self.get_response(msg_id))
            self.send("received")
        else:
            print(msg_id)


    def close(self):
        self.client_socket.close()


def main(port=1214):
    http_server = HTTPServer()
    http_server.bind(port)
    http_server.start()


if __name__ == "__main__":
    main()
