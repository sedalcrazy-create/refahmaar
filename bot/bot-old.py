#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import time
import requests
import json
from datetime import datetime
import threading

BOT_TOKEN = os.getenv('BALE_BOT_TOKEN', '64658763:rgYSwBxd05vEuuuNNbNNYZdtA-T1Gxdx5nw')
GAME_URL = os.getenv('GAME_URL', 'https://snake.darmanjoo.ir')
API_URL = os.getenv('API_URL', 'http://app:3001')
BALE_API = f'https://tapi.bale.ai/bot{BOT_TOKEN}'

# Store user states for conversation flow
user_states = {}

def send_message(chat_id, text, reply_markup=None):
    """Send a message to a user"""
    url = f'{BALE_API}/sendMessage'
    data = {
        'chat_id': chat_id,
        'text': text
    }
    if reply_markup:
        data['reply_markup'] = json.dumps(reply_markup)

    try:
        response = requests.post(url, json=data)
        return response.json()
    except Exception as e:
        print(f'Error sending message: {e}')
        return None

def send_game_button(chat_id):
    """Send a button to launch the mini app game"""
    keyboard = {
        'inline_keyboard': [[
            {
                'text': '🎮 شروع بازی مار یلدایی',
                'web_app': {'url': GAME_URL}
            }
        ]]
    }

    text = """
🎮 <b>چالش مار یلدایی</b>

بازی مار یلدایی آماده است!
برای شروع بازی روی دکمه زیر کلیک کنید.

🍎 سیب = 10 امتیاز
🍉 هندوانه = 20 امتیاز
🍇 انار = 30 امتیاز

✨ شادابی و سلامت در سایه رفاه ✨
"""

    url = f'{BALE_API}/sendMessage'
    data = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': 'HTML',
        'reply_markup': json.dumps(keyboard)
    }

    try:
        response = requests.post(url, json=data)
        return response.json()
    except Exception as e:
        print(f'Error sending game button: {e}')
        return None

def handle_start(chat_id, user):
    """Handle /start command"""
    first_name = user.get('first_name', 'کاربر')

    welcome_text = f"""
سلام {first_name} عزیز! 👋

به چالش مار یلدایی اداره کل رفاه و درمان خوش آمدید 🎮

🌙 شب یلدا مبارک!

برای شروع بازی، لطفاً اطلاعات زیر را وارد کنید:

✅ کد استخدامی
✅ شماره تماس

لطفاً کد استخدامی خود را ارسال کنید:
"""

    send_message(chat_id, welcome_text)
    user_states[chat_id] = {'state': 'waiting_employee_code', 'user_id': user.get('id')}

def handle_employee_code(chat_id, employee_code):
    """Handle employee code input"""
    # Validate employee code (basic validation)
    if not employee_code or len(employee_code) < 3:
        send_message(chat_id, '❌ کد استخدامی نامعتبر است. لطفاً دوباره وارد کنید:')
        return

    user_states[chat_id]['employee_code'] = employee_code
    user_states[chat_id]['state'] = 'waiting_phone'

    send_message(chat_id, '✅ کد استخدامی ثبت شد.\n\nحالا لطفاً شماره تماس خود را ارسال کنید:')

def handle_phone_number(chat_id, phone_number):
    """Handle phone number input"""
    # Validate phone number (basic validation)
    phone_clean = phone_number.replace(' ', '').replace('-', '')
    if not phone_clean or len(phone_clean) < 10:
        send_message(chat_id, '❌ شماره تماس نامعتبر است. لطفاً شماره معتبر وارد کنید:')
        return

    user_states[chat_id]['phone_number'] = phone_clean
    user_states[chat_id]['state'] = 'registered'

    # Confirmation message
    employee_code = user_states[chat_id].get('employee_code')
    confirmation_text = f"""
✅ <b>ثبت‌نام با موفقیت انجام شد!</b>

📋 اطلاعات شما:
• کد استخدامی: {employee_code}
• شماره تماس: {phone_number}

حالا می‌توانید بازی را شروع کنید! 🎮
"""

    send_message(chat_id, confirmation_text)

    # Send game button
    time.sleep(1)
    send_game_button(chat_id)

def handle_message(message):
    """Handle incoming messages"""
    chat_id = message['chat']['id']
    user = message.get('from', {})
    text = message.get('text', '').strip()

    print(f'Message from {chat_id}: {text}')

    # Handle /start command
    if text.startswith('/start'):
        handle_start(chat_id, user)
        return

    # Check user state
    user_state = user_states.get(chat_id, {})
    current_state = user_state.get('state')

    if current_state == 'waiting_employee_code':
        handle_employee_code(chat_id, text)
    elif current_state == 'waiting_phone':
        handle_phone_number(chat_id, text)
    elif current_state == 'registered':
        # User already registered, send game button again
        send_game_button(chat_id)
    else:
        # Unknown state, restart
        send_message(chat_id, 'لطفاً دستور /start را ارسال کنید تا شروع کنیم.')

def get_updates(offset=None):
    """Get updates from Bale"""
    url = f'{BALE_API}/getUpdates'
    params = {'timeout': 30}
    if offset:
        params['offset'] = offset

    try:
        response = requests.get(url, params=params, timeout=35)
        return response.json()
    except Exception as e:
        print(f'Error getting updates: {e}')
        return None

def post_leaderboard():
    """Post leaderboard to channel (every 30 minutes)"""
    # TODO: Implement channel posting
    # This would need a channel ID where leaderboard is posted
    pass

def leaderboard_scheduler():
    """Schedule leaderboard posting every 30 minutes"""
    while True:
        try:
            time.sleep(1800)  # 30 minutes
            post_leaderboard()
        except Exception as e:
            print(f'Error in leaderboard scheduler: {e}')

def main():
    """Main bot loop"""
    print('Bot starting...')
    print(f'Game URL: {GAME_URL}')
    print(f'API URL: {API_URL}')
    print(f'Bale API: {BALE_API}')
    print('Bot running. Press Ctrl+C to stop.')

    # Start leaderboard scheduler in background
    scheduler_thread = threading.Thread(target=leaderboard_scheduler, daemon=True)
    scheduler_thread.start()

    offset = None

    while True:
        try:
            updates = get_updates(offset)

            if not updates or not updates.get('ok'):
                time.sleep(1)
                continue

            for update in updates.get('result', []):
                offset = update['update_id'] + 1

                if 'message' in update:
                    handle_message(update['message'])

        except KeyboardInterrupt:
            print('\nBot stopped.')
            break
        except Exception as e:
            print(f'Error in main loop: {e}')
            time.sleep(5)

if __name__ == '__main__':
    main()
