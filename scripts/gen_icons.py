import struct, zlib
def create_png(width, height, filepath):
    def create_pixel_data():
        data = b''
        cx, cy = width // 2, height // 2
        r = width // 2 - 4
        for y in range(height):
            data += b'\x00'
            for x in range(width):
                dx, dy = x - cx, y - cy
                dist = (dx*dx + dy*dy) ** 0.5
                if dist <= r:
                    if dist <= r - 8:
                        t = y / height
                        red = int(5 + (16-5)*t)
                        green = int(150 + (185-150)*t)
                        blue = int(105 + (129-105)*t)
                        data += struct.pack('BBBB', red, green, blue, 255)
                    else:
                        data += struct.pack('BBBB', 4, 120, 87, 255)
                else:
                    data += struct.pack('BBBB', 0, 0, 0, 0)
        return data
    raw = create_pixel_data()
    compressed = zlib.compress(raw)
    def make_chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc
    png = b'\x89PNG\r\n\x1a\n'
    png += make_chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    png += make_chunk(b'IDAT', compressed)
    png += make_chunk(b'IEND', b'')
    with open(filepath, 'wb') as f:
        f.write(png)
create_png(192, 192, '/home/z/my-project/public/icon-192.png')
create_png(512, 512, '/home/z/my-project/public/icon-512.png')
print('Icons created!')
