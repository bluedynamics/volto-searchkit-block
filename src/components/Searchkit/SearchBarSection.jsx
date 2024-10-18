import { useIntl } from 'react-intl';
import { Icon as IconSemantic } from 'semantic-ui-react';
import { onQueryChanged, SearchBar, withState } from 'react-searchkit';

import messages from '../../messages';

const _SearchBarSection = (props) => {
  const intl = useIntl();

  const payloadOfReset = {
    searchQuery: {
      sortBy: 'bestmatch',
      sortOrder: 'asc',
      layout: 'list',
      page: 1,
      size: 10,
      queryString: '',
    },
  };

  return (
    <div className="searchbar-wrapper">
      <SearchBar
        placeholder={' '}
        autofocus="false"
        uiProps={{
          icon: 'search',
          iconPosition: 'left',
        }}
        actionProps={{
          content: intl.formatMessage(messages.search),
        }}
      />
    </div>
  );
};

export default withState(_SearchBarSection);
