// Canned email sets for tuning the digest prompt offline.
// Each fixture is one "week" of emails for a hypothetical user. Add more
// here whenever you want a new scenario to keep evaluating against.

type FixtureEmail = {
  sender: string
  subject: string
  body: string
  instructions: string
}

export type Fixture = {
  id: string
  name: string
  /** A short, plain-English description of what we expect to see in the output. */
  expectation: string
  emails: FixtureEmail[]
}

export const FIXTURES: Fixture[] = [
  {
    id: 'school-elementary-week',
    name: 'Elementary school — typical week',
    expectation:
      'Action: field trip slip + $14 by Thu, COVID waiver by Wed. Important: picture day moved to Mar 28, PTA Tue 7pm, Bus 217 reroute Mon. Ignore: reply-all "thanks" chains, cafeteria menus.',
    emails: [
      {
        sender: 'Lincoln PTA <pta@lincolnelementary.org>',
        subject: 'Field trip permission slip + $14 due Thursday',
        body: `Dear families,
The 3rd-grade field trip to the science museum is this Thursday March 21. Please sign and return the attached permission slip by Wednesday evening. Cost is $14 per student — cash or Venmo to the office.
Chaperones: we still need 2 more parents. Email back if you can join.
PTA`,
        instructions: '',
      },
      {
        sender: 'Lincoln Health Office <nurse@lincolnelementary.org>',
        subject: 'Annual COVID waiver — due Wednesday',
        body: `This is a reminder that the annual COVID liability waiver has not been returned for your student. The signed form is required for school participation. Please submit by end of day Wednesday March 20. Form attached.`,
        instructions: '',
      },
      {
        sender: 'Mrs. Carter <carter@lincolnelementary.org>',
        subject: 'Picture day moved to Friday March 28',
        body: `Hi families — heads up that picture day has been moved from March 14 to Friday March 28. Order forms went home today. Online ordering deadline is March 27.`,
        instructions: '',
      },
      {
        sender: 'Lincoln PTA <pta@lincolnelementary.org>',
        subject: 'PTA meeting Tuesday at 7pm — gym entrance',
        body: `Monthly PTA meeting Tuesday March 19 at 7pm. Please enter through the gym doors as the main entrance is being repainted. Agenda: spring fundraiser, playground project, principal Q&A.`,
        instructions: '',
      },
      {
        sender: 'District Transportation <transport@lincoln.k12.us>',
        subject: 'Bus 217 route adjustment effective Monday',
        body: `Bus 217 will be taking a slightly modified route effective Monday March 18 due to construction on Oak Ave. Pickup at Maple/3rd will move two blocks to Maple/5th. Estimated pickup time stays the same.`,
        instructions: '',
      },
      {
        sender: 'Spring Soccer League <signups@springsoccer.us>',
        subject: 'Spring soccer signups now open',
        body: `Spring rec soccer signups for ages 6-12 are open. Season runs April through June. Deadline to register is April 4. $85 per player.`,
        instructions: '',
      },
      {
        sender: 'Allison Park <aparkmom@gmail.com>',
        subject: 'Re: PTA meeting Tuesday at 7pm — gym entrance',
        body: `Thanks!!`,
        instructions: '',
      },
      {
        sender: 'David Liu <dliu@gmail.com>',
        subject: 'Re: PTA meeting Tuesday at 7pm — gym entrance',
        body: `Thank you so much!`,
        instructions: '',
      },
      {
        sender: 'Sam (Room 4) <sam.r4@gmail.com>',
        subject: 'Re: PTA meeting Tuesday at 7pm — gym entrance',
        body: `🙏`,
        instructions: '',
      },
      {
        sender: 'Lincoln Cafeteria <cafe@lincolnelementary.org>',
        subject: 'Cafeteria menu — week of March 17',
        body: `Monday: pasta. Tuesday: chicken nuggets. Wednesday: pizza day. Thursday: turkey sandwiches. Friday: fish sticks. Milk and fruit included.`,
        instructions: '',
      },
      {
        sender: 'Lincoln Cafeteria <cafe@lincolnelementary.org>',
        subject: 'Cafeteria menu — week of March 17 (resend)',
        body: `Apologies for the duplicate. Same menu as before.`,
        instructions: '',
      },
    ],
  },
  {
    id: 'work-light-week',
    name: 'Work — light week, one deadline',
    expectation:
      'Action: quarterly report due Fri. Important: town hall Wed 11am, HR enrollment closes April 30. Ignore: status emoji updates, OOO autoreplies.',
    emails: [
      {
        sender: 'Sarah K (CFO) <sarah@company.com>',
        subject: 'Q1 report draft needed by Friday EOD',
        body: `Hey — please get me your section of the Q1 report by Friday end of day. Focus on the metrics dashboard and any notable wins. Format same as last quarter. Slide deck shared in the usual folder.`,
        instructions: '',
      },
      {
        sender: 'All Company <allhands@company.com>',
        subject: 'Town hall Wednesday 11am — new product preview',
        body: `Mark your calendar: this week's town hall is Wednesday at 11am Pacific. Leadership will preview the new product launching in May. Q&A at the end.`,
        instructions: '',
      },
      {
        sender: 'HR <hr@company.com>',
        subject: 'Benefits enrollment closes April 30',
        body: `Benefits open enrollment is now live. Review your medical, dental, vision, and 401k elections. Default is to roll over last year's choices. Deadline: April 30. Portal link inside.`,
        instructions: '',
      },
      {
        sender: 'Status Bot <status@company.com>',
        subject: 'Daily status: 5 things',
        body: `🟢 deploy passed
🟢 metrics nominal
🟢 PRs reviewed
🟢 SLO healthy
🟢 no incidents`,
        instructions: '',
      },
      {
        sender: 'Marcus L <marcus@company.com>',
        subject: 'Auto-reply: out of office',
        body: `I'm out until next Monday. For urgent items contact Priya. Otherwise I'll respond on my return.`,
        instructions: '',
      },
    ],
  },
  {
    id: 'empty-week',
    name: 'Quiet week — nothing important',
    expectation:
      'Action: None at this time. Important: None at this time. Possibly omit Opportunities + Safe to Ignore entirely.',
    emails: [],
  },
]

export function getFixture(id: string): Fixture | undefined {
  return FIXTURES.find((f) => f.id === id)
}
