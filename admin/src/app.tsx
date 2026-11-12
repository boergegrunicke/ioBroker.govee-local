import React from 'react';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import { Box } from '@mui/material';
import {
    AdminConnection,
    GenericApp,
    Loader,
    type GenericAppProps,
    type GenericAppSettings,
} from '@iobroker/adapter-react-v5';

import Settings from './components/Settings';

import en from '../i18n/en.json';
import de from '../i18n/de.json';
import ru from '../i18n/ru.json';
import pt from '../i18n/pt.json';
import nl from '../i18n/nl.json';
import fr from '../i18n/fr.json';
import it from '../i18n/it.json';
import es from '../i18n/es.json';
import pl from '../i18n/pl.json';
import uk from '../i18n/uk.json';
import zhCn from '../i18n/zh-cn.json';

/**
 * Admin settings page of the govee-local adapter.
 * GenericApp handles the socket connection, loading/saving of the instance's native config,
 * theme and the Save/Close buttons.
 */
class App extends GenericApp {
    /** Validation errors per config attribute; any entry blocks saving. */
    private validationErrors: Record<string, string> = {};

    /** @param props passed by index.tsx (adapterName) */
    constructor(props: GenericAppProps) {
        const settings: GenericAppSettings = {
            ...props,
            translations: { en, de, ru, pt, nl, fr, it, es, pl, uk, 'zh-cn': zhCn },
            // GenericApp defaults to the plain Connection, which lacks admin-only calls like getHostByIp.
            // The typings expect an instance here, but GenericApp instantiates the given class.
            Connection: AdminConnection as unknown as GenericAppSettings['Connection'],
        };
        super(props, settings);
    }

    private onValidationError = (attr: string, error: string | null): void => {
        if (error) {
            this.validationErrors[attr] = error;
        } else {
            delete this.validationErrors[attr];
        }
        const first = Object.values(this.validationErrors)[0];
        this.setConfigurationError(first || '');
    };

    /** Renders the settings page once the config is loaded, a loader before. */
    render(): React.JSX.Element {
        let content: React.JSX.Element;
        if (!this.state.loaded) {
            content = <Loader themeType={this.state.themeType} />;
        } else {
            content = (
                <Box
                    className="App"
                    sx={{
                        backgroundColor: 'background.default',
                        color: 'text.primary',
                        minHeight: '100vh',
                    }}
                >
                    <Settings
                        native={this.state.native as ioBroker.AdapterConfig}
                        socket={this.socket}
                        adapterName={this.adapterName}
                        instance={this.instance}
                        host={this.common?.host}
                        onChange={(attr, value) => this.updateNativeValue(attr, value)}
                        onError={this.onValidationError}
                    />
                    {this.renderError()}
                    {this.renderToast()}
                    {this.renderSaveCloseButtons()}
                </Box>
            );
        }
        return (
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={this.state.theme}>{content}</ThemeProvider>
            </StyledEngineProvider>
        );
    }
}

export default App;
