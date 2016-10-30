import asyncio
import websockets

class Server:
    def __init__(self, header_size=32):
        self.welcome_message = b'@w|h:' + str(header_size).encode()
        self.header_size = header_size
        self.functions = {}
        self.is_busy = False
        self.bytes_read = 0

    async def __get_job_info(request):
        function_name = None
        packet_size = None

        sections = request[0:self.header_size + 1].decode('ascii').split('|')

        if sections[0] == '@j':
            parameters = sections[1].split(',')

            for parameter in parameters:
                parameter_tuple = parameter.split(':')

                if parameter_tuple[0] == 'n':
                    function_name = parameter_tuple[1]
                elif parameter_tuple[0] == 's':
                    packet_size = int(parameter_tuple[1])
                else:
                    print('Invalid header parameter sent')

        self.bytes_read += self.header_size
        return (function_name, packet_size)

    async def __get_inputs(request, packet_name):
        input_schema = self.functions[packet_name]['inputs']
        offset = 0
        bytes_read = 0
        inputs = {}

        for i, input in enumerate(input_schema):
            start_pos = self.header_size + 1 + offset + (i * self.header_size)
            end_pos = start_pos + self.header_size + 1
            parameters = request[start_pos:end_pos].decode('ascii').split(',')
            bytes_read += header_size

            input_name = None
            input_type = None
            input_size = None

            for parameter in parameters:
                parameter_tuple = parameter.split(':')

                if parameter_tuple[0] == 'i':
                    input_name = parameter_tuple[1]
                elif parameter_tuple[0] == 't':
                    input_type = parameter_tuple[1]
                elif parameter_tuple[0] == 's':
                    input_size = int(parameter_tuple[1])
                else:
                    print('Invalid input parameter sent')
                    return (None, None)

            if input_name and input_type and input_size:
                if input_name not in input_schema or input_type != input_schema[input_name]:
                    print('Invalid input')
                    return (None, None)

                offset += input_size + 1
                bytes_read += input_size

                input_data = request[end_pos:input_size + 1]
                inputs[input_name] = input_data
            else:
                print('Missing input parameter')
                return (None, None)

        return (inputs, bytes_read)

    async def __build_output_packet(self, outputs, packet_name):
        output_schema = self.functions[packet_name]['outputs']
        packet_header = b'@r|o:' + packet_name.encode()
        output_packet = b''

        for output_name, raw_value in outputs.items():
            if output_name in output_schema:
                output_value = None
                if type(raw_value) is str:
                    output_value = raw_value.encode()
                if type(raw_value) is bytes:
                    output_value = raw_value
                else:
                    output_value = str(raw_value).encode()

                output_header = b'o:' + output_name.encode()
                output_header += b',t:' + output_schema[output_name].encode()
                output_header += b',s:' + str(len(output_value)).encode()

                if len(output_header) > self.header_size:
                    print('Output header too big')
                    return None
                else:
                    output_packet += output_header.ljust(self.header_size) + output_value
            else:
                print('Invalid function output')
                return None

        packet_header += b',s:' + str(len(output_packet) + self.header_size).encode()

        if len(packet_header) > self.header_size:
            print('Packer header too big')
            return None
        else:
            output_packet = packet_header.ljust(self.header_size) + output_packet
            return output_packet

    async def __process_incoming_message(self, request):
        if self.is_busy:
            return b'@e|m:busy'
        else:
            self.is_busy = True

            packet_name, packet_size = await self.__get_job_info(request)
            if not function_name or not packet_size:
                return b'@e|m:invalid_job_request'

            inputs, bytes_read = await self.__get_inputs(request, packet_name)
            if not inputs or bytes_read:
                return b'@e|m:invalid_inputs'

            if (bytes_read + self.header_size != packet_size):
                return b'@e|m:invalid_packet_size'

            outputs = self.functions[packet_name]['function'](**inputs)
            output_packet = await self.__build_output_packet(outputs, packet_name)
            if not output_packet:
                return b'@e|m:server_function_error'

            self.is_busy = False
            return output_packet

    def __add_to_welcome_message(self, function_def):
        self.welcome_message += b'|n:' + function_def['name'].encode()
        for input in function_def['inputs']:
            self.welcome_message += b';i:' + input[0].encode() + b',t:' + input[1].encode()
        for output in function_def['outputs']:
            self.welcome_message += b';o:' + output[0].encode() + b',t:' + output[1].encode()

    async def __handler(self, websocket, _):
        await websocket.send(self.welcome_message)
        while True:
            request = await websocket.recv()
            response = await self.__process_incoming_message(request)
            await websocket.send(response)

    def add_function(self, **kwargs):
        name = kwargs.get('name', None)
        if not name:
            print('Function name must be provided')

        inputs = kwargs.get('inputs', None)
        if not inputs:
            print('Function inputs must be provided')

        outputs = kwargs.get('outputs', None)
        if not outputs:
            print('Function outputs must be provided')

        function = kwargs.get('function', None)
        if not function:
            print('Function method must be provided')

        function_def = {
            'name': name,
            'inputs': inputs,
            'outputs': outputs,
            'function': function}

        self.functions[name] = function_def
        self.__add_to_welcome_message(function_def)

    def start_server(self, ip, port):
        asyncio.get_event_loop().run_until_complete(websockets.serve(self.__handler, ip, port, max_size=None))
        asyncio.get_event_loop().run_forever()

def classify_jpg(image):
    for i in range(1000000):
        continue
    return {'label': 'test_label'}

def classify_png(image):
    for i in range(1000000):
        continue
    return {'label': 'test_label'}

def test():
    servicer = Server()

    servicer.add_function(
        name = 'classify_jpg',
        inputs = {'image': 'jpg'},
        outputs = {'label': 'string'},
        function = classify_jpg)

    servicer.add_function(
        name = 'classify_png',
        inputs = {'image': 'png'},
        outputs = {'label': 'string'},
        function = classify_png)

    servicer.start_server('localhost', 1234)

if __name__ == '__main__':
    test() 
