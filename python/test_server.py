import servicer

def classify_jpg(image):
    for i in range(1000000):
        continue
    return {'label': 'test_label'}

def classify_png(image):
    for i in range(1000000):
        continue
    return {'label': 'test_label'}

def test():
    server = servicer.Server()

    server.add_function(
        name = 'classify_jpg',
        inputs = {'image': 'binary'},
        outputs = {'label': 'string'},
        function = classify_jpg)

    server.add_function(
        name = 'classify_png',
        inputs = {'image': 'binary'},
        outputs = {'label': 'string'},
        function = classify_png)

    server.start_server('localhost', 5678)

if __name__ == '__main__':
    test() 
