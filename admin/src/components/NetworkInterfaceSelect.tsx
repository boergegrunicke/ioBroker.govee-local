import React, { useEffect, useState } from 'react';
import { FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { I18n, type AdminConnection } from '@iobroker/adapter-react-v5';

interface IpEntry {
    name: string;
    address: string;
}

interface NetworkInterfaceSelectProps {
    label: string;
    value: string;
    socket: AdminConnection;
    /** host the instance runs on; IPs are read from this host */
    host: string | undefined;
    onChange: (value: string) => void;
}

/**
 * IPv4 address selection of the instance's host, including "0.0.0.0 - listen on all IPs".
 * Equivalent to jsonConfig `ip` with `listenOnAllPorts: true` and `onlyIp4: true`.
 * Falls back to a free text input if the host's addresses cannot be read.
 *
 * @param props see NetworkInterfaceSelectProps
 */
export default function NetworkInterfaceSelect(props: NetworkInterfaceSelectProps): React.JSX.Element {
    const { socket, host } = props;
    const [ips, setIps] = useState<IpEntry[] | null>(null);

    useEffect(() => {
        if (!host) {
            return;
        }
        let cancelled = false;
        socket
            .getHostByIp(host)
            .then(list => {
                if (cancelled) {
                    return;
                }
                setIps(
                    list
                        .filter(item => item.family === 'ipv4')
                        .map(item => ({
                            address: item.address,
                            name:
                                item.address === '0.0.0.0'
                                    ? `[IPv4] 0.0.0.0 - ${I18n.t('_listenOnAllIps')}`
                                    : item.name,
                        })),
                );
            })
            .catch(e => console.error(e));
        return () => {
            cancelled = true;
        };
    }, [socket, host]);

    if (!ips) {
        return (
            <TextField
                variant="standard"
                fullWidth
                label={I18n.t(props.label)}
                value={props.value ?? ''}
                onChange={e => props.onChange(e.target.value)}
            />
        );
    }

    const selected = ips.find(it => it.address === props.value);
    return (
        <FormControl
            fullWidth
            variant="standard"
        >
            <InputLabel>{I18n.t(props.label)}</InputLabel>
            <Select
                variant="standard"
                value={props.value ?? ''}
                renderValue={val => selected?.name || val}
                onChange={e => props.onChange(e.target.value)}
            >
                {ips.map(it => (
                    <MenuItem
                        key={it.address}
                        value={it.address}
                    >
                        {it.name}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}
