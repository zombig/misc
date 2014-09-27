#!/usr/bin/python -tt

# Scrape signal data from the web interface on Motorola SurfBoard cable
# modems, v1.0
# Copyright (c) 2014, John Morrissey
# 
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are
# met:
#
#    * Redistributions of source code must retain the above copyright
#      notice, this list of conditions and the following disclaimer.
#    * Redistributions in binary form must reproduce the above copyright
#      notice, this list of conditions and the following disclaimer in the
#      documentation and/or other materials provided with the distribution.
# 
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
# IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
# THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
# PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
# CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
# EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
# PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
# PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
# LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
# NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
# SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

CONFIG = {
    'down': {
        'table_header': 'Downstream',
        'traits': {
            'Frequency': 'freq',
            'Signal to Noise Ratio': 'snr',
            'Downstream Modulation': 'mod',
            'Power Level': 'pwr',
        },
    },
    'up': {
        'table_header': 'Upstream',
        'traits': {
            'Frequency': 'freq',
            'Ranging Service ID': 'ranging_svc_id',
            'Symbol Rate': 'symrate',
            'Power Level': 'pwr',
            'Upstream Modulation': 'mod',
            'Ranging Status': 'ranging_status',
        },
    },
    'signal': {
        'table_header': 'Signal Stats',
        'traits': {
            'Total Unerrored Codewords': 'unerrored',
            'Total Correctable Codewords': 'correctable',
            'Total Uncorrectable Codewords': 'uncorrectable',
        },
    },
}
OUTPUT = [
    {
        'key': 'pwr',
        'direction': 'up',
        'label': 'Avg. upstream power',
    },
    {
        'key': 'pwr',
        'direction': 'down',
        'label': 'Avg. downstream power',
    },
    {
        'key': 'snr',
        'direction': 'down',
        'label': 'Avg. downstream SnR',
    },
    {
        'key': 'unerrored',
        'direction': 'down',
        'label': 'Avg. downstream unerrored codewords',
    },
    {
        'key': 'correctable',
        'direction': 'down',
        'label': 'Avg. downstream correctable codewords',
    },
    {
        'key': 'uncorrectable',
        'direction': 'down',
        'label': 'Avg. downstream uncorrectable codewords',
    },
]


import lxml.html
import requests

body = requests.get('http://192.168.100.1/cmSignalData.htm')
tree = lxml.html.fromstring(body.text)

data = {}
for item, config in CONFIG.items():
    table = tree.xpath('.//th[contains(., "{}")]/../..'.format(
        config['table_header']))[0]

    channels = table.xpath(
        './/td[contains(., "Channel ID")]/following-sibling::td')
    channels = [
        int(chan.text.strip())
        for chan
         in channels
    ]

    data[item] = dict(
        (channel, {})
        for channel
         in channels
    )
    for web, trait in config['traits'].items():
        chan_traits = table.xpath(
            './/td[contains(., "{}")]/following-sibling::td'.format(web))
        for i in range(len(chan_traits)):
            data[item][channels[i]][trait] = chan_traits[i].text.strip()


for chan, sigstats in data['signal'].items():
    for into in ['down', 'up']:
        if chan in data[into]:
            data[into][chan].update(sigstats)
            del data['signal'][chan]
if not data['signal']:
    del data['signal']


def items_in(thing, key):
    return [
        float(thing[chan][key].split()[0])
        for chan
         in thing
    ]
for item in OUTPUT:
    values = items_in(data[item['direction']], item['key'])
    avg = sum(values) / len(values)
    print '{}: {}'.format(item['label'], avg)
