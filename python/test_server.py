import taskrelay

def binary_test(input):
    test_data = b'1234567890abcdef'
    if type(input) is bytes and input == test_data:
        print('Binary test (client -> server) passed')
    else:
        print('Binary test (client -> server) failed')
    return {'result': test_data}

def boolean_test(input):
    test_data = False
    if type(input) is bool and input == test_data:
        print('Boolean test (client -> server) passed')
    else:
        print('Boolean test (client -> server) failed')
    return {'result': test_data}

def string_test(input):
    test_data = 'asdfghjkl'
    if type(input) is str and input == test_data:
        print('String test (client -> server) passed')
    else:
        print('String test (client -> server) failed')
    return {'result': test_data}

def integer_test(input):
    test_data = 12345
    if type(input) is int and input == test_data:
        print('Integer test (client -> server) passed')
    else:
        print('Integer test (client -> server) failed')
    return {'result': test_data}

def float_test(input):
    test_data = 1.2345
    if type(input) is float and input == test_data:
        print('Float test (client -> server) passed')
    else:
        print('Float test (client -> server) failed')
    return {'result': test_data}

def multi_test(input_boolean, input_integer):
    test_data_boolean = False
    test_data_integer = 567889014
    for i in range(100000000): # Delay
        continue
    if (type(input_boolean) is bool and input_boolean == test_data_boolean and
        type(input_integer) is int and input_integer == test_data_integer):
        print('Multi test (client -> server) passed')
    else:
        print('Multi test (client -> server) failed')
        print(input_boolean)
        print(input_integer)
    return {
        'result_string': 'test_label',
        'result_float': 1.2345
    }

def test():
    server = taskrelay.Server()

    server.create_task(
        name = 'binary_test',
        inputs = {'input': 'binary'},
        outputs = {'result': 'binary'},
        function = binary_test)

    server.create_task(
        name = 'boolean_test',
        inputs = {'input': 'boolean'},
        outputs = {'result': 'boolean'},
        function = boolean_test)

    server.create_task(
        name = 'string_test',
        inputs = {'input': 'string'},
        outputs = {'result': 'string'},
        function = string_test)

    server.create_task(
        name = 'integer_test',
        inputs = {'input': 'integer'},
        outputs = {'result': 'integer'},
        function = integer_test)

    server.create_task(
        name = 'float_test',
        inputs = {'input': 'float'},
        outputs = {'result': 'float'},
        function = float_test)

    server.create_task(
        name = 'multi_test',
        inputs = {
            'input_boolean': 'boolean',
            'input_integer': 'integer'
        },
        outputs = {
            'result_string': 'string',
            'result_float': 'float'
        },
        function = multi_test)

    server.start_server('localhost', 5678)

if __name__ == '__main__':
    test()
