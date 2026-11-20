import React, { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { I18n, type AdminConnection } from '@iobroker/adapter-react-v5';

interface DiscoveredDevicesProps {
    socket: AdminConnection;
    /** full state ID, e.g. govee-local.0.info.discoveredDevices */
    stateId: string;
}

/** One discovered device: IP address and device name/id as reported by the adapter. */
interface DeviceRow {
    ip: string;
    name: string;
}

/**
 * Parses the JSON written by the adapter (`{ [ip]: deviceName }`) into sorted table rows.
 *
 * @param raw the raw state value
 */
function parseDevices(raw: unknown): DeviceRow[] {
    if (typeof raw !== 'string' || raw === '') {
        return [];
    }
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return [];
        }
        const ipValue = (ip: string): number =>
            ip.split('.').reduce((acc, octet) => acc * 256 + (parseInt(octet, 10) || 0), 0);
        return Object.entries(parsed as Record<string, unknown>)
            .map(([ip, name]) => ({ ip, name: typeof name === 'string' ? name : JSON.stringify(name) }))
            .sort((a, b) => ipValue(a.ip) - ipValue(b.ip));
    } catch {
        return [];
    }
}

/**
 * Read-only live table of the adapter's discovered devices (JSON text written by the adapter).
 *
 * @param props see DiscoveredDevicesProps
 */
export default function DiscoveredDevices(props: DiscoveredDevicesProps): React.JSX.Element {
    const { socket, stateId } = props;
    const [devices, setDevices] = useState<DeviceRow[]>([]);

    useEffect(() => {
        const handler = (_id: string, state: ioBroker.State | null | undefined): void => {
            setDevices(parseDevices(state?.val));
        };
        socket
            .getState(stateId)
            .then(state => handler(stateId, state))
            .catch(e => console.error(e));
        socket.subscribeState(stateId, handler).catch(e => console.error(e));
        return () => socket.unsubscribeState(stateId, handler);
    }, [socket, stateId]);

    return (
        <Box>
            <Typography
                variant="body2"
                sx={{ color: 'text.secondary', marginBottom: 1 }}
            >
                {I18n.t('_discoveredDevices')}
            </Typography>
            {devices.length === 0 ? (
                <Typography variant="body2">{I18n.t('_noDevicesDiscovered')}</Typography>
            ) : (
                <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ maxWidth: 600 }}
                >
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>{I18n.t('_discoveredDeviceIp')}</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>{I18n.t('_discoveredDeviceName')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {devices.map(device => (
                                <TableRow key={device.ip}>
                                    <TableCell>{device.ip}</TableCell>
                                    <TableCell>{device.name}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
}
