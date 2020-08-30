*Disclaimer: This post is for informational purposes only. If this post inspires you to create something similar please proceed at your own risk.*

*If you want to skip straight to using the Python driver, it can be found here: [PyPI](https://pypi.org/project/pywatlow/)*

Watlow EZ-Zone temperature controllers are staple in any laboratory application
requiring a heating/cooling feedback loop. They are extremely flexible and reliable PID
(proportional–integral–derivative) controllers.

After years of working with these controllers, my only complaint is the manual
button quality. The buttons slowly degrade and the contacts get dirty requiring
an increasing amount of force to register a button press and change the setpoint,
often to the point that the buttons themselves start to crack and fall apart.
This doesn't seen to be a unique problem as there are a few YouTube videos demonstrating
how to clean the contacts and fix these buttons. However, I was pretty sure that
they could be computer controlled and the whole button issue bypassed altogether.
This would also allow us to set all of our controllers to the same temperature
with a single button press or change them individually.

To start, Watlow has both a standard bus protocol (RS-485) and a Modbus protocol on
certain models. So, a USB to RS-485 converter will be necessary for this project.
Watlow also has an unofficial LabVIEW driver available on the National Instruments
website. For some, however, this may not be suitable for their application or LabVIEW may
not be available. For these cases, something like Python may be more suitable.

Fortunately, I wasn't the only one interested in writing a Watlow driver. In fact,
most of the reverse engineering of the serial messages has been demonstrated here:

* https://reverseengineering.stackexchange.com/questions/8303/rs-485-checksum-reverse-engineering-watlow-ez-zone-pm
* https://forums.ni.com/t5/Instrument-Control-GPIB-Serial/Watlow-EZ-Zone-PM-ENET-RS-485/td-p/3079711


The command protocol used by the controllers is BACnet master-slave/token-passing.
First, a typical read command is 16 hex bytes long. Let's break down an example,

`55 FF 05 10 00 00 06 E8 01 03 01 04 01 01 E3 99`

This command requests the measured temperature from the Watlow controller at address 1.

We can assign meaning to nearly the entire message, but the purpose of some of these
hex bytes remains unclear to me. The first two hex bytes (`55 FF`) are the BACnet
preamble and are always included at the beginning of a message. Followed by the
preamble is the request parameter. Similar to the preamble, this does not change
for requests (it's always `05`).

The next hex byte is the "zone" or address of the Watlow temperature controller,
where `10` is address 1, `11` is address 2, `12` is address 3, etc. Watlow allows
for up to 16 controllers connected in series to a single RS-485 bus and you can
manually set each controller's address through their setup screens.

Currently, I am uncertain what bytes `00 00 06` mean (but they do differ depending
on whether the command is read or write).

The end of the command header is signified by the BACnet "header CRC", which is
a single 8-bit byte (`E8` in the example). This check byte is calculated using a
cyclic redundancy check (CRC) algorithm, which is based on the remainder
resulting from polynomial division of the command's contents.

## Calculating the Header Check Byte

To implement the CRC calculation used by the Watlow PM3 (reverse engineered here:
https://reverseengineering.stackexchange.com/questions/8303/rs-485-checksum-reverse-engineering-watlow-ez-zone-pm)
in Python, we can write the following function:

```python
def _headerCheckByte(self, headerBytes):
        '''
        Takes the full header byte array bytes[0] through bytes[6] of the full
        command and returns a check byte (bytearray of length one) using Watlow's
        algorithm

        Implementation relies on this post:
        https://reverseengineering.stackexchange.com/questions/8303/rs-485-checksum-reverse-engineering-watlow-ez-zone-pm
        '''
        crc_8_table = [
            0x00, 0xfe, 0xff, 0x01, 0xfd, 0x03, 0x02, 0xfc,
            0xf9, 0x07, 0x06, 0xf8, 0x04, 0xfa, 0xfb, 0x05,
            0xf1, 0x0f, 0x0e, 0xf0, 0x0c, 0xf2, 0xf3, 0x0d,
            0x08, 0xf6, 0xf7, 0x09, 0xf5, 0x0b, 0x0a, 0xf4,
            0xe1, 0x1f, 0x1e, 0xe0, 0x1c, 0xe2, 0xe3, 0x1d,
            0x18, 0xe6, 0xe7, 0x19, 0xe5, 0x1b, 0x1a, 0xe4,
            0x10, 0xee, 0xef, 0x11, 0xed, 0x13, 0x12, 0xec,
            0xe9, 0x17, 0x16, 0xe8, 0x14, 0xea, 0xeb, 0x15,
            0xc1, 0x3f, 0x3e, 0xc0, 0x3c, 0xc2, 0xc3, 0x3d,
            0x38, 0xc6, 0xc7, 0x39, 0xc5, 0x3b, 0x3a, 0xc4,
            0x30, 0xce, 0xcf, 0x31, 0xcd, 0x33, 0x32, 0xcc,
            0xc9, 0x37, 0x36, 0xc8, 0x34, 0xca, 0xcb, 0x35,
            0x20, 0xde, 0xdf, 0x21, 0xdd, 0x23, 0x22, 0xdc,
            0xd9, 0x27, 0x26, 0xd8, 0x24, 0xda, 0xdb, 0x25,
            0xd1, 0x2f, 0x2e, 0xd0, 0x2c, 0xd2, 0xd3, 0x2d,
            0x28, 0xd6, 0xd7, 0x29, 0xd5, 0x2b, 0x2a, 0xd4,
            0x81, 0x7f, 0x7e, 0x80, 0x7c, 0x82, 0x83, 0x7d,
            0x78, 0x86, 0x87, 0x79, 0x85, 0x7b, 0x7a, 0x84,
            0x70, 0x8e, 0x8f, 0x71, 0x8d, 0x73, 0x72, 0x8c,
            0x89, 0x77, 0x76, 0x88, 0x74, 0x8a, 0x8b, 0x75,
            0x60, 0x9e, 0x9f, 0x61, 0x9d, 0x63, 0x62, 0x9c,
            0x99, 0x67, 0x66, 0x98, 0x64, 0x9a, 0x9b, 0x65,
            0x91, 0x6f, 0x6e, 0x90, 0x6c, 0x92, 0x93, 0x6d,
            0x68, 0x96, 0x97, 0x69, 0x95, 0x6b, 0x6a, 0x94,
            0x40, 0xbe, 0xbf, 0x41, 0xbd, 0x43, 0x42, 0xbc,
            0xb9, 0x47, 0x46, 0xb8, 0x44, 0xba, 0xbb, 0x45,
            0xb1, 0x4f, 0x4e, 0xb0, 0x4c, 0xb2, 0xb3, 0x4d,
            0x48, 0xb6, 0xb7, 0x49, 0xb5, 0x4b, 0x4a, 0xb4,
            0xa1, 0x5f, 0x5e, 0xa0, 0x5c, 0xa2, 0xa3, 0x5d,
            0x58, 0xa6, 0xa7, 0x59, 0xa5, 0x5b, 0x5a, 0xa4,
            0x50, 0xae, 0xaf, 0x51, 0xad, 0x53, 0x52, 0xac,
            0xa9, 0x57, 0x56, 0xa8, 0x54, 0xaa, 0xab, 0x55
        ]

        # Watlow's header check byte algorithm:
        intCheck = ~crc_8_table[headerBytes[6] ^ crc_8_table[headerBytes[5] ^ \
                  crc_8_table[headerBytes[4] ^ crc_8_table[headerBytes[3] ^ \
                  crc_8_table[~headerBytes[2]]]]]] & (2**8-1)
        return bytes([intCheck])
```

The algorithm takes the complement of `headerBytes[2]` and uses it as index to find
the corresponding value in the CRC-8 table. Then, an XOR (`^`) operation is calculated
using `headerBytes[3]` and the previous value. The new value is used as index to
find the corresponding CRC-8 table value, etc. After calculating the final CRC-8 table value
(`crc_8_table[57] = 0x17 = 23`) and taking the complement, we end up with
`~crc_8_table[57] = ~0x17 = -24`. The bytes representation of -24 in Python is
`-0x18`, but it needs to be 8-bit. We can accomplish that with
bitwise AND, `& (2**8-1)`. For the above example,

```python
>>> -0x18 & (2**8-1)
232
# Where the byte representation is:
>>> bytes([232])
b'\xe8'
# And the hex representation is:
>>> b'\xe8'.hex()
'e8'
```

## Calculating the Data Check Bytes

The rest of the bytes (“01 03 01 04 01 01 E3 99”) are considered the data portion
of the byte array. Unfortunately, the meaning of the `01 03 01` bytes is unclear
to me, but they exist in the read requests. Based on inspection of many requests
and responses, it has something to do with whether the byte array is read-only
or writing a value and whether it's a request or a response.

The `04 01` bytes correspond to the parameter ID for the "Analog Input Value" aka
the current temperature found in the Watlow PM3 user manual.  In other words,
“04 01” is what tells the controller that you are requesting the current temperature.
After the parameter ID, `01` corresponds to the instance. I have yet to come
across a situation where this was not equal to `01`.

At the very end of the command, we arrive at the final two check bytes. This is used
to verify the integrity of the data portion of the byte array,
`01 03 01 04 01 01` in our example.

The data check byte uses a 17-bit polynomial (CRC-16). In this case, we can
abstract most of the polynomial generation using Python's crcmod library. The
reverse-engineered function (again, from the above Stack Overflow link) starts
at -1 (`0xFFFF`), uses `0x1021` as polynomial, and is bit reversed.

The following function takes the data byte array and calculates the two check bytes,

```python
def _dataCheckByte(self, dataBytes):
        '''
        Takes the full data byte array, bytes[8] through bytes[13] of the full
        command and calculates the data check byte using CRC-16
        '''
        # CRC-16 with 0xFFFF as initial value, 0x1021 as polynomial, bit reversed
        crc_fun = crcmod.mkCrcFun(poly=0x11021, initCrc=0, rev=True, xorOut=0xFFFF)
        # bytes object packed using C-type unsigned short, little-endian:
        byte_str = struct.pack('<H', crc_fun(dataBytes))
        return byte_str
```
For our example, the result is `b'\xe3\x99'` or `e3 99`.

For commands that use different parameters, commands that write to the controller,
and responses, the length and contents of each command will be slightly different.
For example,

```python
# Example response:
'55 FF 06 00 10 00 0B 88 02 03 01 04 01 01 08 46 8F 36 38 DD 0E'
# Example set temperature request (address 1, 80 F):
'55 FF 05 10 00 00 0A EC 01 04 07 01 01 08 42 A0 00 00 7C 0D'
```

However, they all contain a header and data portion of the command as well as calculate
their header/data check bytes the same way. While the scope of communicating with
Watlow temperature controllers is wide enough to fill a separate textbook, this
should give you a basic understanding of how one might approach communicating with
Watlow temperature controllers.

You can find an example program that I wrote for our Watlow controllers here:
 [GitHub](https://github.com/BrendanSweeny/watlow_gui)
