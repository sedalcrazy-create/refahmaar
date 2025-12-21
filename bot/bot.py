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

def send_message(chat_id, text, reply_markup=None, parse_mode=None):
    """Send a message to a user"""
    url = f'{BALE_API}/sendMessage'
    data = {
        'chat_id': chat_id,
        'text': text
    }
    if reply_markup:
        data['reply_markup'] = json.dumps(reply_markup)
    if parse_mode:
        data['parse_mode'] = parse_mode

    try:
        response = requests.post(url, json=data)
        return response.json()
    except Exception as e:
        print(f'Error sending message: {e}')
        return None

def send_persistent_keyboard(chat_id):
    """Send persistent keyboard with game, stats, and leaderboard buttons"""
    keyboard = {
        'keyboard': [
            [
                {
                    'text': '🎮 شروع بازی',
                    'web_app': {'url': GAME_URL}
                },
                {'text': '🏆 رتبه‌بندی'}
            ],
            [
                {'text': '📊 آمار من'}
            ]
        ],
        'resize_keyboard': True,
        'persistent': True
    }

    return keyboard

def send_contact_request(chat_id, first_time=True):
    """Send keyboard with contact request button"""
    keyboard = {
        'keyboard': [[
            {
                'text': '📱 ارسال شماره تماس',
                'request_contact': True
            }
        ]],
        'resize_keyboard': True,
        'one_time_keyboard': True
    }

    if first_time:
        text = '''✅ کد استخدامی ثبت شد.

⚠️ <b>توجه مهم:</b>
برای ثبت شماره تماس، حتماً روی دکمه آبی «📱 ارسال شماره تماس» در پایین صفحه کلیک کنید.

❌ <b>شماره را تایپ نکنید!</b>
فقط با کلیک روی دکمه، شماره شما ثبت می‌شود.'''
    else:
        text = '''⚠️ <b>لطفاً شماره را تایپ نکنید!</b>

روی دکمه آبی «📱 ارسال شماره تماس» در پایین صفحه کلیک کنید.'''

    send_message(chat_id, text, reply_markup=keyboard, parse_mode='HTML')

def check_user_exists(bale_user_id):
    """Check if user exists in database"""
    try:
        response = requests.get(f'{API_URL}/api/user/{bale_user_id}', timeout=5)
        if response.status_code == 200:
            return response.json()
        return None
    except Exception as e:
        print(f'Error checking user: {e}')
        return None

def register_user_in_db(bale_user_id, phone_number, first_name, last_name, employee_code):
    """Register user in database"""
    try:
        data = {
            'baleUserId': str(bale_user_id),
            'phoneNumber': phone_number,
            'firstName': first_name,
            'lastName': last_name,
            'employeeCode': employee_code
        }
        response = requests.post(f'{API_URL}/api/register', json=data, timeout=5)
        if response.status_code == 200:
            return response.json()
        else:
            print(f'Registration failed: {response.text}')
            return None
    except Exception as e:
        print(f'Error registering user: {e}')
        return None

def get_user_stats(bale_user_id):
    """Get user stats and leaderboard"""
    try:
        # Get user stats
        stats_response = requests.get(f'{API_URL}/api/user/{bale_user_id}/stats', timeout=5)
        # Get top 10 leaderboard
        leaderboard_response = requests.get(f'{API_URL}/api/leaderboard/top/10', timeout=5)

        if stats_response.status_code == 200 and leaderboard_response.status_code == 200:
            return {
                'stats': stats_response.json(),
                'leaderboard': leaderboard_response.json()
            }
        return None
    except Exception as e:
        print(f'Error getting stats: {e}')
        return None

def format_leaderboard_message(leaderboard):
    """Format leaderboard message"""
    message = """🏆 <b>برترین بازیکنان (مجموع ۳ بازی)</b>

"""

    # Add top 10
    for i, player in enumerate(leaderboard[:10], 1):
        medal = '🥇' if i == 1 else '🥈' if i == 2 else '🥉' if i == 3 else f'{i}.'
        name = f"{player['first_name']} {player['last_name']}"
        if player['first_name'] == 'pending':
            name = 'بازیکن'
        games = player.get('games_played', 0)
        message += f"{medal} {name}: {player['high_score']} ({games} بازی)\n"

    message += """\n✨ شادابی و سلامت در سایه رفاه ✨"""

    return message

def show_user_stats(chat_id, bale_user_id):
    """Display user statistics"""
    stats_data = get_user_stats(bale_user_id)

    if stats_data and stats_data.get('stats'):
        stats = stats_data['stats']
        name = f"{stats['first_name']} {stats['last_name']}"
        games_played = stats.get('games_played', 0)
        games_remaining = max(0, 3 - games_played)
        total_kills = stats.get('total_kills', 0)

        message = f"""📊 <b>آمار {name}</b>

🏅 رتبه شما: {stats['rank'] or 'نامشخص'}
⭐ مجموع امتیاز: {stats['high_score']}
💀 تعداد کشتار: {total_kills}
🎮 تعداد بازی: {games_played} از 3
🐍 مجموع طول مار: {stats['max_length']}"""

        if games_remaining > 0:
            message += f"\n\n📍 شما هنوز {games_remaining} بازی دارید!"

        message += "\n\n✨ شادابی و سلامت در سایه رفاه ✨"

        send_message(chat_id, message, parse_mode='HTML')
    else:
        send_message(chat_id, '❌ خطا در دریافت آمار. لطفاً دوباره تلاش کنید.')

def show_leaderboard(chat_id):
    """Display leaderboard"""
    try:
        response = requests.get(f'{API_URL}/api/leaderboard/top/10', timeout=5)
        if response.status_code == 200:
            leaderboard = response.json()
            message = format_leaderboard_message(leaderboard)
            send_message(chat_id, message, parse_mode='HTML')
        else:
            send_message(chat_id, '❌ خطا در دریافت جدول امتیازات.')
    except Exception as e:
        print(f'Error showing leaderboard: {e}')
        send_message(chat_id, '❌ خطا در دریافت جدول امتیازات.')

def handle_start(chat_id, user):
    """Handle /start command"""
    bale_user_id = user.get('id')
    first_name = user.get('first_name', 'کاربر')

    # Check if user already exists in database
    existing_user = check_user_exists(bale_user_id)

    if existing_user:
        # Returning user - show welcome + stats + persistent keyboard
        stats_data = get_user_stats(bale_user_id)

        if stats_data and stats_data.get('stats'):
            stats = stats_data['stats']
            welcome_text = f"""خوش آمدید {stats['first_name']} 👋

📊 رکورد شما: {stats['high_score']} امتیاز
🏅 رتبه: {stats['rank'] or 'نامشخص'}"""

            keyboard = send_persistent_keyboard(chat_id)
            send_message(chat_id, welcome_text, reply_markup=keyboard, parse_mode='HTML')
        else:
            welcome_text = f"خوش آمدید {first_name} 👋"
            keyboard = send_persistent_keyboard(chat_id)
            send_message(chat_id, welcome_text, reply_markup=keyboard)

        user_states[chat_id] = {'state': 'registered', 'user_id': bale_user_id}
    else:
        # New user - start registration flow
        welcome_text = f"""سلام {first_name} عزیز! 👋

به چالش یلدایی اداره کل رفاه و درمان خوش آمدید 🎮

🌙 شب یلدا مبارک!

برای شروع، لطفاً <b>نام</b> خود را ارسال کنید:"""

        send_message(chat_id, welcome_text, parse_mode='HTML')
        user_states[chat_id] = {
            'state': 'waiting_first_name',
            'user_id': bale_user_id
        }

def handle_first_name(chat_id, first_name):
    """Handle first name input"""
    if not first_name or len(first_name) < 2:
        send_message(chat_id, '❌ نام نامعتبر است. لطفاً نام معتبر وارد کنید:')
        return

    user_states[chat_id]['first_name'] = first_name
    user_states[chat_id]['state'] = 'waiting_last_name'

    send_message(chat_id, '✅ نام ثبت شد.\n\nحالا لطفاً <b>نام خانوادگی</b> خود را ارسال کنید:', parse_mode='HTML')

def handle_last_name(chat_id, last_name):
    """Handle last name input"""
    if not last_name or len(last_name) < 2:
        send_message(chat_id, '❌ نام خانوادگی نامعتبر است. لطفاً نام خانوادگی معتبر وارد کنید:')
        return

    user_states[chat_id]['last_name'] = last_name
    user_states[chat_id]['state'] = 'waiting_employee_code'

    send_message(chat_id, '✅ نام خانوادگی ثبت شد.\n\nحالا لطفاً <b>کد استخدامی</b> خود را ارسال کنید:', parse_mode='HTML')

def handle_employee_code(chat_id, employee_code):
    """Handle employee code input"""
    # Validate employee code (basic validation)
    if not employee_code or len(employee_code) < 3:
        send_message(chat_id, '❌ کد استخدامی نامعتبر است. لطفاً دوباره وارد کنید:')
        return

    user_states[chat_id]['employee_code'] = employee_code
    user_states[chat_id]['state'] = 'waiting_contact'

    # Send contact request button
    send_contact_request(chat_id, first_time=True)

def format_phone_number(phone):
    """Format phone number to 09xxxxxxxxx format"""
    # Remove any spaces, dashes, or parentheses
    phone = phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    # Remove country code if present
    if phone.startswith('+98'):
        phone = '0' + phone[3:]
    elif phone.startswith('98'):
        phone = '0' + phone[2:]
    elif phone.startswith('0098'):
        phone = '0' + phone[4:]
    # Ensure it starts with 0
    if not phone.startswith('0'):
        phone = '0' + phone
    return phone

def handle_contact(chat_id, contact):
    """Handle contact (phone number) received"""
    phone_number = contact.get('phone_number')

    if not phone_number:
        send_message(chat_id, '❌ شماره تماس دریافت نشد. لطفاً دوباره تلاش کنید.')
        send_contact_request(chat_id)
        return

    # Format phone number
    phone_number = format_phone_number(phone_number)

    user_data = user_states.get(chat_id, {})
    bale_user_id = user_data.get('user_id')
    first_name = user_data.get('first_name')
    last_name = user_data.get('last_name')
    employee_code = user_data.get('employee_code')

    if not bale_user_id or not first_name or not last_name or not employee_code:
        send_message(chat_id, '❌ خطا در ثبت اطلاعات. لطفاً دستور /start را مجدد ارسال کنید.')
        user_states.pop(chat_id, None)
        return

    # Register user in database
    result = register_user_in_db(bale_user_id, phone_number, first_name, last_name, employee_code)

    if result and result.get('success'):
        user_states[chat_id]['state'] = 'registered'
        user_states[chat_id]['phone_number'] = phone_number

        # Success message
        confirmation_text = f"""✅ <b>ثبت‌نام با موفقیت انجام شد!</b>

📋 اطلاعات ثبت شده:
• نام: {first_name} {last_name}
• کد استخدامی: {employee_code}
• شماره تماس: {phone_number}

حالا می‌توانید بازی کنید! 🎮

از منوی زیر می‌توانید استفاده کنید:"""

        keyboard = send_persistent_keyboard(chat_id)
        send_message(chat_id, confirmation_text, reply_markup=keyboard, parse_mode='HTML')
    else:
        send_message(chat_id, '❌ خطا در ثبت‌نام. لطفاً دوباره تلاش کنید.\n\nدستور /start را ارسال کنید.')
        user_states.pop(chat_id, None)

def handle_message(message):
    """Handle incoming messages"""
    chat_id = message['chat']['id']
    user = message.get('from', {})
    text = message.get('text', '').strip()
    contact = message.get('contact')

    print(f'Message from {chat_id}: {text if text else "contact"}')

    # Handle /start command
    if text and text.startswith('/start'):
        handle_start(chat_id, user)
        return

    # Handle contact (phone number)
    if contact:
        handle_contact(chat_id, contact)
        return

    # Handle persistent keyboard buttons - use bale_user_id directly from message
    bale_user_id = user.get('id')

    if text == '📊 آمار من':
        if bale_user_id:
            # Check if user exists in database first
            existing_user = check_user_exists(bale_user_id)
            if existing_user:
                show_user_stats(chat_id, bale_user_id)
            else:
                send_message(chat_id, 'شما هنوز ثبت‌نام نکرده‌اید. لطفاً دستور /start را ارسال کنید.')
        else:
            send_message(chat_id, 'لطفاً ابتدا دستور /start را ارسال کنید.')
        return

    if text == '🏆 رتبه‌بندی' or text == '🏆 جدول امتیازات':
        show_leaderboard(chat_id)
        return

    # Check user state for registration flow
    user_state = user_states.get(chat_id, {})
    current_state = user_state.get('state')

    if current_state == 'waiting_first_name':
        handle_first_name(chat_id, text)
    elif current_state == 'waiting_last_name':
        handle_last_name(chat_id, text)
    elif current_state == 'waiting_employee_code':
        handle_employee_code(chat_id, text)
    elif current_state == 'waiting_contact':
        # User typed something instead of clicking the button
        send_contact_request(chat_id, first_time=False)
    elif current_state == 'registered':
        # User already registered, show help
        send_message(chat_id, 'از دکمه‌های زیر برای استفاده از ربات استفاده کنید:\n\n🎮 شروع بازی - برای ورود به بازی\n📊 آمار من - مشاهده آمار شما\n🏆 جدول امتیازات - مشاهده برترین بازیکنان')
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

def main():
    """Main bot loop"""
    print('Bot starting...')
    print(f'Game URL: {GAME_URL}')
    print(f'API URL: {API_URL}')
    print(f'Bale API: {BALE_API}')
    print('Bot running. Press Ctrl+C to stop.')

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
