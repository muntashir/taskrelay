import taskrelay

def classify_jpg(image):
    for i in range(100000000):
        continue
    return {'label': 'test_label'}

def classify_png(image):
    for i in range(100000000):
        continue
    return {'label': 'test_label'}

def test():
    server = taskrelay.Server()

    server.create_task(
        name = 'classify_jpg',
        inputs = {'image': 'binary'},
        outputs = {'label': 'string'},
        function = classify_jpg)

    server.create_task(
        name = 'classify_png',
        inputs = {'image': 'binary'},
        outputs = {'label': 'string'},
        function = classify_png)

    server.start_server('localhost', 5678)

if __name__ == '__main__':
    test()
