import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { I18n, type AdminConnection } from '@iobroker/adapter-react-v5';

interface DiscoveredDevicesProps {
    socket: AdminConnection;
    /** full state ID, e.g. govee-local.0.info.discoveredDevices */
    stateId: string;
}

/**
 * Read-only live view of the adapter's discovered devices (JSON text written by the adapter).
 *
 * @param props see DiscoveredDevicesProps
 */
export default function DiscoveredDevices(props: DiscoveredDevicesProps): React.JSX.Element {
    const { socket, stateId } = props;
    const [value, setValue] = useState<string>('');

    useEffect(() => {
        const handler = (_id: string, state: ioBroker.State | null | undefined): void => {
            setValue(state?.val === null || state?.val === undefined ? '' : String(state.val));
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
                sx={{ color: 'text.secondary' }}
            >
                {I18n.t('_discoveredDevices')}
            </Typography>
            <Box
                component="pre"
                sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}
            >
                {value}
            </Box>
        </Box>
    );
}
