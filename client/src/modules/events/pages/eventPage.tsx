import { LockIcon } from '@chakra-ui/icons';
import {
  Heading,
  VStack,
  Image,
  Text,
  Button,
  useToast,
  List,
  HStack,
  ListItem,
  Avatar,
  useDisclosure,
  Box,
  Flex,
  Spacer,
  Badge,
} from '@chakra-ui/react';
import { useConfirm } from 'chakra-confirm';
import { Link } from 'chakra-next-link';
import { NextPage } from 'next';
import React, { useMemo } from 'react';

import { LoginRegisterModal } from '../../../components/LoginRegisterModal';
import { useAuth } from '../../auth/store';
import { EVENT } from '../../dashboard/Events/graphql/queries';
import {
  useEventQuery,
  useRsvpToEventMutation,
  useInitUserInterestForChapterMutation,
} from 'generated/graphql';
import { useParam } from 'hooks/useParam';

export const EventPage: NextPage = () => {
  const id = useParam('eventId');
  const { user } = useAuth();

  const [rsvpToEvent] = useRsvpToEventMutation();
  const [initUserInterestForChapter] = useInitUserInterestForChapterMutation();
  const { loading, error, data } = useEventQuery({
    variables: { id: id || -1 },
  });

  const toast = useToast();
  const confirm = useConfirm();
  const modalProps = useDisclosure();

  const userRsvped = useMemo(() => {
    const rsvp = data?.event?.rsvps.find((rsvp) => rsvp.user.id === user?.id);
    if (!rsvp) return null;
    return rsvp.on_waitlist ? 'waitlist' : 'rsvp';
  }, [data?.event]);

  if (loading) {
    return <h1>Loading...</h1>;
  }

  if (error || !data?.event) {
    return (
      <div>
        <h1>error...</h1>
        <h2>{error?.message}</h2>
      </div>
    );
  }

  const handleLoginUserFirst = () => {
    modalProps.onOpen();
  };

  const onRsvp = async (add: boolean) => {
    const ok = await confirm(
      add
        ? { title: 'You want to join this?' }
        : { title: 'Are you sure you want to cancel your RSVP' },
    );

    if (ok) {
      try {
        await rsvpToEvent({
          variables: { eventId: id },
          refetchQueries: [{ query: EVENT, variables: { id } }],
        });

        toast(
          add
            ? {
                title: 'You successfully RSVPed to this event',
                status: 'success',
              }
            : { title: 'You canceled your RSVP 👋', status: 'error' },
        );
        if (add) {
          await initUserInterestForChapter({
            variables: { event_id: id },
          });
        }
      } catch (err) {
        toast({ title: 'Something went wrong', status: 'error' });
        console.error(err);
      }
    }
  };

  const rsvps = data.event.rsvps.filter((r) => !r.on_waitlist);
  const waitlist = data.event.rsvps.filter((r) => r.on_waitlist);
  const checkOnRsvp = async (add: boolean) => {
    if (!user) {
      return handleLoginUserFirst();
    }

    await onRsvp(add);
  };

  return (
    <VStack align="flex-start">
      <LoginRegisterModal
        onRsvp={onRsvp}
        userIds={data?.event?.rsvps.map((r) => r.user.id) || []}
        modalProps={modalProps}
      />
      <Image
        data-cy="event-image"
        boxSize="100%"
        maxH="300px"
        src={data.event.image_url}
        alt=""
        borderRadius="md"
        objectFit="cover"
      />

      <Heading as="h1">
        {data.event.invite_only && <LockIcon />}
        {data.event.name}
      </Heading>
      <Heading size="md">
        Chapter:{' '}
        <Link href={`/chapters/${data.event.chapter.id}`}>
          {data.event.chapter.name}
        </Link>
      </Heading>
      <Text>{data.event.description}</Text>
      <VStack align="start">
        {rsvps && <Heading>RSVPs:{rsvps.length}</Heading>}
        {waitlist && <Heading>Waitlist:{waitlist.length}</Heading>}
      </VStack>
      {userRsvped === 'rsvp' ? (
        <HStack>
          <Heading>You&lsquo;ve RSVPed to this event</Heading>
          <Button colorScheme="red" onClick={() => checkOnRsvp(false)}>
            Cancel
          </Button>
        </HStack>
      ) : userRsvped === 'waitlist' ? (
        <HStack>
          {data.event.invite_only ? (
            <Heading>Event owner will soon confirm your request</Heading>
          ) : (
            <Heading>You&lsquo;re on waitlist for this event</Heading>
          )}
          <Button colorScheme="red" onClick={() => checkOnRsvp(false)}>
            Cancel
          </Button>
        </HStack>
      ) : (
        <Button
          data-cy="rsvp-button"
          colorScheme="blue"
          onClick={() => checkOnRsvp(true)}
        >
          {data.event.invite_only ? 'Request' : 'RSVP'}
        </Button>
      )}

      {data.event.sponsors.length ? (
        <Box p="2" borderRadius="lg" mt="2">
          <Heading size="lg">Sponsors</Heading>
          <Spacer />
          <Flex wrap="wrap" justifyContent="center">
            {data.event.sponsors.map((item) => (
              <Box
                key={item.sponsor.id}
                p="6"
                m="6"
                borderWidth="1px"
                borderRadius="lg"
                overflow="hidden"
              >
                <Heading size="sm">
                  <Link href={item.sponsor.website} isExternal>
                    {item.sponsor.name}
                  </Link>
                </Heading>
                <Badge m="1">{item.sponsor.type}</Badge>
              </Box>
            ))}
          </Flex>
        </Box>
      ) : (
        false
      )}
      <Heading data-cy="rsvps-heading" size="md">
        RSVPs:
      </Heading>
      <List>
        {rsvps.map((rsvp) => (
          <ListItem key={rsvp.user.id} mb="2">
            <HStack>
              <Avatar name={rsvp.user.name} />
              <Heading size="md">{rsvp.user.name}</Heading>
            </HStack>
          </ListItem>
        ))}
      </List>

      {!data.event.invite_only && (
        <>
          <Heading data-cy="waitlist-heading" size="md">
            Waitlist:
          </Heading>
          <List>
            {waitlist.map((rsvp) => (
              <ListItem key={rsvp.user.id} mb="2">
                <HStack>
                  <Avatar name={rsvp.user.name} />
                  <Heading size="md">{rsvp.user.name}</Heading>
                </HStack>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </VStack>
  );
};
