# TaskRelay Binary Protocol

All data is sent as binary using WebSockets as a transport. Each packet has a header of a fixed size, describing its contents.

When a client connects to the server, a welcome message is sent, defining what tasks can be run, their inputs and outputs, and the header size to use for the packets.
