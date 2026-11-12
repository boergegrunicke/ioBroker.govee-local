import React from 'react';
import { Checkbox, FormControl, FormControlLabel, Grid2 as Grid, InputLabel, MenuItem, Select } from '@mui/material';
import { I18n, type AdminConnection } from '@iobroker/adapter-react-v5';

import { Cell, FULL, SectionHeader, StaticText } from './layout';
import NumberField from './NumberField';
import ChipInput from './ChipInput';
import NetworkInterfaceSelect from './NetworkInterfaceSelect';
import DiscoveredDevices from './DiscoveredDevices';

type ScanMode = ioBroker.AdapterConfig['scanMode'];

const SCAN_MODES: { value: ScanMode; label: string }[] = [
    { value: 'interval', label: '_scanModeInterval' },
    { value: 'once', label: '_scanModeOnce' },
    { value: 'never', label: '_scanModeNever' },
];

interface SettingsProps {
    native: ioBroker.AdapterConfig;
    socket: AdminConnection;
    adapterName: string;
    instance: number;
    host: string | undefined;
    onChange: <K extends keyof ioBroker.AdapterConfig>(attr: K, value: ioBroker.AdapterConfig[K]) => void;
    onError: (attr: string, error: string | null) => void;
}

/**
 * The settings page: Network, discovery mode, manual IP addresses and logging.
 *
 * @param props see SettingsProps
 */
export default function Settings(props: SettingsProps): React.JSX.Element {
    const { native, onChange, onError } = props;
    const onNumberChange = (attr: string, value: number): void =>
        onChange(attr as 'searchInterval' | 'deviceStatusRefreshInterval', value);

    return (
        <Grid
            container
            columnSpacing={2}
            rowSpacing={1}
            sx={{ width: '100%', padding: '10px' }}
        >
            {/* Network */}
            <SectionHeader text="Network" />
            <StaticText text="_networkHint" />
            <Cell
                cols={{ xs: 12, sm: 12, md: 6, lg: 4, xl: 4 }}
                newLine
            >
                <NetworkInterfaceSelect
                    label="_networkInterface"
                    value={native.interface}
                    socket={props.socket}
                    host={props.host}
                    onChange={value => onChange('interface', value)}
                />
            </Cell>

            {/* Discovery mode */}
            <SectionHeader text="_scanMode" />
            <Cell cols={{ xs: 12, sm: 12, md: 6, lg: 4, xl: 4 }}>
                <FormControl
                    fullWidth
                    variant="standard"
                >
                    <InputLabel>{I18n.t('_scanMode')}</InputLabel>
                    <Select
                        variant="standard"
                        value={native.scanMode || 'interval'}
                        onChange={e => onChange('scanMode', e.target.value as ScanMode)}
                    >
                        {SCAN_MODES.map(mode => (
                            <MenuItem
                                key={mode.value}
                                value={mode.value}
                            >
                                {I18n.t(mode.label)}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Cell>
            {(native.scanMode || 'interval') === 'interval' ? (
                <Cell cols={{ xs: 12, sm: 6, md: 3, lg: 2, xl: 2 }}>
                    <NumberField
                        attr="searchInterval"
                        label="_searchInterval"
                        value={native.searchInterval}
                        min={1}
                        max={1000}
                        onChange={onNumberChange}
                        onError={onError}
                    />
                </Cell>
            ) : null}
            <Cell cols={{ xs: 12, sm: 6, md: 3, lg: 2, xl: 2 }}>
                <NumberField
                    attr="deviceStatusRefreshInterval"
                    label="_deviceStatusRefreshInterval"
                    value={native.deviceStatusRefreshInterval}
                    min={1}
                    max={1000}
                    onChange={onNumberChange}
                    onError={onError}
                />
            </Cell>

            {/* Manual IP addresses */}
            <SectionHeader text="_manualIpAddresses" />
            <StaticText text="_manualIpHint" />
            <StaticText
                text="_discoveredDevicesHint"
                newLine
            />
            <Cell
                cols={FULL}
                newLine
            >
                <DiscoveredDevices
                    socket={props.socket}
                    stateId={`${props.adapterName}.${props.instance}.info.discoveredDevices`}
                />
            </Cell>
            <Cell cols={FULL}>
                <ChipInput
                    label="_manualIpAddresses"
                    value={native.manualIpTable}
                    onChange={value => onChange('manualIpTable', value)}
                />
            </Cell>

            {/* Logging */}
            <SectionHeader text="Logging" />
            <StaticText text="_extendedLoggingDescription" />
            <Cell cols={{ xs: 12, sm: 12, md: 6, lg: 3, xl: 3 }}>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={!!native.extendedLogging}
                            onChange={e => onChange('extendedLogging', e.target.checked)}
                        />
                    }
                    label={I18n.t('_extendedLogging')}
                />
            </Cell>
        </Grid>
    );
}
