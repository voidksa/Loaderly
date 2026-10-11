"""Isolated QA StatusNotifier host. Exercises Electron's real D-Bus item/menu."""
import json
import sys
import dbus
import dbus.service
from dbus.mainloop.glib import DBusGMainLoop
from gi.repository import GLib

DBusGMainLoop(set_as_default=True)
bus = dbus.SessionBus()
iface = 'org.kde.StatusNotifierWatcher'
control = 'com.loaderly.TrayTest'
objpath = '/StatusNotifierWatcher'

if len(sys.argv) > 1 and sys.argv[1] == 'client':
    watcher = bus.get_object(iface, objpath)
    action = sys.argv[2]
    if action == 'host':
        watcher.SetHost(sys.argv[3] == 'true', dbus_interface=control)
        sys.exit(0)
    items = watcher.GetItems(dbus_interface=control)
    result = []
    for service, path in items:
        item = bus.get_object(service, path)
        try:
            props = item.GetAll('org.kde.StatusNotifierItem', dbus_interface='org.freedesktop.DBus.Properties')
        except dbus.DBusException:
            continue
        if action == 'activate':
            item.Activate(0, 0, dbus_interface='org.kde.StatusNotifierItem')
        menu = bus.get_object(service, props['Menu'])
        revision, layout = menu.GetLayout(dbus.Int32(0), dbus.Int32(-1), dbus.Array([], signature='s'), dbus_interface='com.canonical.dbusmenu')
        entries = []
        def visit(node):
            ident, attrs, children = node
            entries.append({'id': int(ident), 'label': str(attrs.get('label', ''))})
            for child in children:
                visit(child)
        visit(layout)
        if action == 'click':
            entry = next(e for e in entries if e['label'] == sys.argv[3])
            menu.Event(entry['id'], 'clicked', dbus.Int32(0), dbus.UInt32(0), dbus_interface='com.canonical.dbusmenu')
        result.append({'service': str(service), 'path': str(path), 'title': str(props.get('Title', '')),
                       'status': str(props.get('Status', '')), 'iconPixels': sum(len(p[2]) for p in props.get('IconPixmap', [])), 'entries': entries})
    print(json.dumps(result))
    sys.exit(0)

class Watcher(dbus.service.Object):
    def __init__(self):
        self.name = dbus.service.BusName(iface, bus)
        super().__init__(bus, objpath)
        self.host = True
        self.items = []

    @dbus.service.method(iface, in_signature='s', out_signature='', sender_keyword='sender')
    def RegisterStatusNotifierItem(self, service, sender=None):
        name, path = (sender, service) if service.startswith('/') else (service, '/StatusNotifierItem')
        if (name, path) not in self.items:
            self.items.append((name, path))
            self.StatusNotifierItemRegistered(name + path)

    @dbus.service.method(iface, in_signature='s', out_signature='')
    def RegisterStatusNotifierHost(self, service):
        self.host = True

    @dbus.service.signal(iface, signature='s')
    def StatusNotifierItemRegistered(self, item): pass

    @dbus.service.signal(iface, signature='')
    def StatusNotifierHostRegistered(self): pass

    @dbus.service.method('org.freedesktop.DBus.Properties', in_signature='s', out_signature='a{sv}')
    def GetAll(self, interface):
        return {'RegisteredStatusNotifierItems': dbus.Array([name + path for name, path in self.items], signature='s'),
                'IsStatusNotifierHostRegistered': dbus.Boolean(self.host), 'ProtocolVersion': dbus.Int32(0)}

    @dbus.service.method('org.freedesktop.DBus.Properties', in_signature='ss', out_signature='v')
    def Get(self, interface, prop): return self.GetAll(interface)[prop]

    @dbus.service.method(control, in_signature='', out_signature='a(ss)')
    def GetItems(self): return self.items

    @dbus.service.method(control, in_signature='b', out_signature='')
    def SetHost(self, value): self.host = value

watcher = Watcher()
print('READY', flush=True)
GLib.MainLoop().run()
