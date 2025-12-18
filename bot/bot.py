#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import time
import requests

BOT_TOKEN = os.getenv('BALE_BOT_TOKEN', '64658763:rgYSwBxd05vEuuuNNbNNYZdtA-T1Gxdx5nw')
GAME_URL = os.getenv('GAME_URL', 'https://snake.darmanjoo.ir')
API_URL = os.getenv('API_URL', 'http://app:3001')

print('Bot starting...')
print(f'Game URL: {GAME_URL}')
print(f'API URL: {API_URL}')
print('Bot running. Press Ctrl+C to stop.')

# Keep bot running
while True:
    time.sleep(60)
