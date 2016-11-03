import asyncio
import websockets

class Server:
    def __init__(self, header_size=64):
        self.welcome_message = b'@w|h:' + str(header_size).encode()
        self.header_size = header_size
        self.functions = {}
        self.bytes_read = 0

    async def __get_job_info(request):
        packet_name = None
        packet_size = None
        packet_id = None

        sections = request[0:self.header_size + 1].decode('ascii').split('|')

        if sections[0] == '@j':
            parameters = sections[1].split(',')

            for parameter in parameters:
                parameter_tuple = parameter.split(':')

                if parameter_tuple[0] == 'n':
                    packet_name = parameter_tuple[1]
                elif parameter_tuple[0] == 's':
                    packet_size = int(parameter_tuple[1])
                elif parameter_tuple[0] == 'd':
                    packet_id = parameter_tuple[1]
                else:
                    print('Invalid header parameter sent')

        return (packet_name, packet_size, packet_id)

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

                raw_input_data = request[end_pos:input_size + 1]
                input_data = None

                if input_type == 'string':
                    input_data = raw_input_data.decode('ascii')
                if input_type == 'binary':
                    input_data = raw_input_data
                if input_type == 'integer':
                    input_data = int(raw_input_data)
                if input_type == 'float':
                    input_data = float(raw_input_data)
                if input_type == 'boolean':
                    input_data = bool(raw_input_data)

                if input_data:
                    inputs[input_name] = input_data
                else:
                    print('Invalid input type')
                    return(None, None)
            else:
                print('Missing input parameter')
                return (None, None)

        return (inputs, bytes_read)

    async def __build_output_packet(self, outputs, packet_name, packet_id):
        output_schema = self.functions[packet_name]['outputs']
        packet_header = b'@r|n:' + packet_name.encode() + b',d:' + packet_id.encode()
        output_packet = b''

        for output_name, raw_value in outputs.items():
            if output_name in output_schema:
                type_schema = output_name[output_schema]
                output_value = None
                if type_schema == 'string':
                    if type(raw_value) is str:
                        output_value = raw_value.encode()
                    else:
                        print('Output value does not match schema')
                        return None
                if type_schema == 'binary':
                    if type(raw_value) is bytes:
                        output_value = raw_value
                    else:
                        print('Output value does not match schema')
                        return None
                if type_schema == 'integer':
                    if type(raw_value) is int:
                        output_value = str(raw_value).encode()
                    else:
                        print('Output value does not match schema')
                        return 
                if type_schema == 'float':
                    if type(raw_value) is float:
                        output_value = str(raw_value).encode()
                    else:
                        print('Output value does not match schema')
                        return None
                if type_schema == 'boolean':
                    if type(raw_value) is bool:
                        output_value = str(int(raw_value)).encode()
                    else:
                        print('Output value does not match schema')
                        return None
                else:
                    print('Output schema invalid')
                    return None

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
        packet_name, packet_size, packet_id = await self.__get_job_info(request)
        if not packet_name or not packet_size or not packet_id:
            return b'@e|m:invalid_job_request'

        inputs, bytes_read = await self.__get_inputs(request, packet_name)
        if not inputs or bytes_read:
            return b'@e|m:invalid_inputs'

        if (bytes_read + self.header_size != packet_size):
            return b'@e|m:invalid_packet_size'

        outputs = self.functions[packet_name]['function'](**inputs)
        output_packet = await self.__build_output_packet(outputs, packet_name, packet_id)
        if not output_packet:
            return b'@e|m:server_function_error'

        return output_packet

    def __add_to_welcome_message(self, function_def):
        self.welcome_message += b'|n:' + function_def['name'].encode()
        for input, input_type in function_def['inputs'].items():
            if input_type not in ['string', 'boolean', 'integer', 'float', 'binary']:
                print('Invalid input type')
            self.welcome_message += b';i:' + input.encode() + b',t:' + input_type.encode()
        for output, output_type in function_def['outputs'].items():
            self.welcome_message += b';o:' + output.encode() + b',t:' + output_type.encode()

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
