# -*- coding: utf-8 -*-
# @Author: jinpingshi
# @Date:   2024/11/20 17:17
# @Last Modified by:   jinpingshi
# @Last Modified time: 2024/11/20 17:17
# @Description: 
# @Mark:

from dotenv import load_dotenv
load_dotenv()
import json
import os
import time
from collections import defaultdict
from datetime import datetime, timedelta
import requests
import random
import logging

_MAX_INT = 2147483647

# 获取当前脚本所在目录
current_dir = os.path.dirname(os.path.realpath(__file__))
config_path = os.path.join(current_dir, 'config.json')
log_file_path = os.path.join(current_dir, 'log.txt')
headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
}

class FlightAlert(object):
    def __init__(self, price_log_file, iata_code_file, config_path):
        self.city2code = {}
        self.code2city = {}
        self.price_log_file = price_log_file
        self.config = self.get_config(config_path, iata_code_file)

        self.update_price_info = defaultdict(dict)
        self.price_info = defaultdict(dict)
        with open(price_log_file, 'r') as f:
            lines = f.readlines()
            for line in lines:
                des, dep_date, arr_date, price, update_time = line.strip().split(',')
                update_time = int(update_time)
                price_dict = {dep_date: {arr_date: price}}
                self.price_info[des] = price_dict

    def get_config(self, config_path, iata_code_file):
        with open(config_path, 'r') as f:
            config = json.load(f)

        # 读取全国机场代码
        with open(iata_code_file, 'r') as f:
            iata_codes = json.load(f)
            for city, code in iata_codes.items():
                self.city2code[city] = code
                self.code2city[code] = city
            iata_codes = list(iata_codes.values())
            config['placeTo'] = iata_codes

        return config

    # date_str: 'YYYYmmdd'
    def get_weekday(self, date_str):
        dep_weekday = time.strptime(date_str, '%Y%m%d').tm_wday + 1  # 星期一从0开始
        return dep_weekday

    def get_flight_response(self, place_from, place_to, flight_way='Roundtrip', is_direct=True, army=False):
        direct = 'true' if is_direct else 'false'
        army = 'true' if army else 'false'
        params = {
            "flightWay": flight_way,
            "dcity": place_from,
            "acity": place_to,
            "direct": direct,
            "army": army,
        }
        try:
            response = requests.get(self.config['baseUrl'], params=params, headers=headers, timeout=3)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to get flight info from {place_to} to {place_from} with error: {e}")
            return None

    def get_flight_price(self, date_str, place_from, place_to, flight_way, army):
        price = 0
        flight_info = self.get_flight_response(place_from, place_to, flight_way, army)
        if flight_info is None or flight_info['status'] == 2:
            logger.warning(
                f"Cannot get the ticket info from {place_to} to {place_from} on date {date_str}")
            return price


        results = flight_info['data']['oneWayPrice']
        if date_str not in results.keys():
            return price

        return results[date_str]

    def process_flight_info(self, flight_info, place_from, place_to, flight_way, army=False):
        if flight_info['status'] == 2:
            logger.info(
                f"Cannot get the ticket information from {place_to} to {place_from}")
            return False

        def check_and_send_alert(dep_date):
            weekday = self.get_weekday(dep_date)
            # 只查询周四和周五出发的机票
            if weekday != 4 and weekday != 5:
                return True

            # dep_date拒当前日期大于21天，返回false
            if (datetime.strptime(dep_date, "%Y%m%d").date() - datetime.now().date()).days > 21:
                return True

            arr_date = (datetime.strptime(dep_date, "%Y%m%d") + timedelta(days=3)).strftime("%Y%m%d")
            if flight_way == 'Roundtrip':
                price = results.get(dep_date, {}).get(arr_date, 0)
                if price and price < self.config['targetPrice']:
                    self.set_low_price(place_from, place_to, dep_date, arr_date, price)
            elif flight_way == 'Oneway':
                dep_price = results.get(dep_date, 0)
                if dep_price:
                    arr_price = self.get_flight_price(arr_date, place_to, place_from, flight_way, army)
                    if arr_price:
                        total_price = dep_price + arr_price
                        if total_price < self.config['targetPrice']:
                            self.set_low_price(place_from, place_to, dep_date, arr_date, total_price)
                    else:
                        logger.info(f'{place_from}->{place_to}, {dep_date}, no return ticket.')

            return True

        results = {}
        if flight_way == 'Roundtrip':
            results = flight_info['data']['roundTripPrice']
        elif flight_way == 'Oneway':
            results = flight_info['data']['oneWayPrice']
        for dep_date, prices in results.items():
            check_and_send_alert(dep_date)

    def set_low_price(self, place_from, place_to, dep_date, arr_date, price):
        old_price = _MAX_INT
        if place_to in self.price_info:
            if dep_date in self.price_info[place_to]:
                if arr_date in self.price_info[place_to][dep_date]:
                    old_price = self.price_info[place_to][dep_date][arr_date]

        # 如果新价格更低，则更新价格信息
        if price < old_price:
            # 更新价格信息，保留其他日期价格不变
            if place_to not in self.price_info:
                self.price_info[place_to] = {}
            if dep_date not in self.price_info[place_to]:
                self.price_info[place_to][dep_date] = {}
            self.price_info[place_to][dep_date][arr_date] = price

            # 同样更新低价提醒信息
            if place_to not in self.update_price_info:
                self.update_price_info[place_to] = {}
            if dep_date not in self.update_price_info[place_to]:
                self.update_price_info[place_to][dep_date] = {}
            self.update_price_info[place_to][dep_date][arr_date] = price

    def save_low_price(self):
        # 定义update_time, 赋值当前时间戳
        print('Found {} round-way flights from {}. Saving...'.format(len(self.price_info), self.config['placeFrom']))
        update_time = int(time.time())
        with open(self.price_log_file, 'a+', encoding='utf-8') as f:
            for place_to, values in self.price_info.items():
                for dep_date, dates in values.items():
                    for arr_date, price in dates.items():
                        try:
                            city_to = self.code2city[place_to]
                            f.write(f'{city_to},{dep_date},{arr_date},{price},{update_time}\n')
                        except KeyError:
                            logger.error(f'No such city {place_to} found.')

    def send_alert(self):
        message = ''
        city_from = self.code2city[self.config['placeFrom']]
        for place_to in self.update_price_info.keys():
            city_to = self.code2city[place_to]
            for dep_date in self.update_price_info[place_to].keys():
                for arr_date in self.update_price_info[place_to][dep_date].keys():
                    price = self.update_price_info[place_to][dep_date][arr_date]
                    message += f'{city_from}->{city_to}, departure: {dep_date}, return: {arr_date}, price: {price}'
                    message += '\n'
        if message != '':
            self.push_message(message)

    def push_message(self, message):
        push_token = os.getenv('PUSH_TOKEN')
        if not push_token:
            logger.error("Push token not found in environment variables")
            return
        send_url = f'https://www.pushplus.plus/send?token={push_token}&title=jp&content={message}'
        requests.get(send_url, headers=headers)

    def run(self):
        place_to_list = self.config['placeTo']
        place_from = self.config['placeFrom']

        # 封装获取和处理航班信息的逻辑
        def handle_flight(place_from, place_to, flight_way, is_direct, army):
            flight_info = self.get_flight_response(place_from, place_to, flight_way=flight_way, is_direct=is_direct,
                                                   army=army)
            if flight_info:
                return self.process_flight_info(flight_info, place_from, place_to, flight_way=flight_way, army=army)

        # 尝试获取并处理往返航班信息
        for place_to in place_to_list:
            if place_to == place_from:
                continue
            print(f'Processing flights from {place_from} to {place_to}...')
            if not handle_flight(place_from, place_to, 'Roundtrip', True, False):
                pass

                # 尝试获取并处理单程非军队航班信息
                # if not handle_flight(place_from, place_to, 'Oneway', False, False):
                #
                #     # 尝试获取并处理单程军队航班信息
                #     handle_flight(place_from, place_to, 'Oneway', False, True)

            time.sleep(random.randrange(1, 4) + random.random())

        self.save_low_price()
        self.send_alert()


if __name__ == "__main__":
    print(log_file_path)
    logging.basicConfig(filename=log_file_path, level=logging.INFO)
    iata_code_file = './iata_code.json'
    price_log_file = './display/public/price_log.txt'
    flight_alert = FlightAlert(price_log_file, iata_code_file, config_path)
    logger = logging.getLogger(flight_alert.__class__.__name__)
    flight_alert.run()
    print('Jobs done.')